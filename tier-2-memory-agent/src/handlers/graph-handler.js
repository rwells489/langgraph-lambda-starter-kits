const { StateGraph, END } = require("@langchain/langgraph");
const { Calculator } = require("@langchain/community/tools/calculator");
const { DuckDuckGoSearchResults } = require("@langchain/community/tools/ddg_search");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBPutItemCommand, DynamoDBGetItemCommand, DynamoDBUpdateItemCommand } = require("@aws-sdk/client-dynamodb");

// Configuration
const TABLE_NAME = process.env.CONVERSATION_TABLE || "LangGraphConversations";

// Initialize AWS clients
const dynamoDbClient = new DynamoDBClient({});

// Define the state for our agent with memory
const agentState = {
  // Input from Lambda event
  input: "",
  // Conversation ID for memory
  conversationId: "",
  // Output from the agent
  output: "",
  // For debugging - we can include intermediate steps
  intermediateSteps: [],
};

// Helper function to get conversation history from DynamoDB
async function getConversationHistory(conversationId) {
  if (!conversationId) return [];

  try {
    const command = new DynamoDBGetItemCommand({
      TableName: TABLE_NAME,
      Key: { conversationId: { S: conversationId } },
    });

    const response = await dynamoDbClient.send(command);
    if (response.Item && response.Item.history) {
      // Assuming we store history as a JSON string in the DynamoDB item
      return JSON.parse(response.Item.history.S);
    }
    return [];
  } catch (error) {
    console.warn("Could not retrieve conversation history:", error);
    return [];
  }
}

// Helper function to save conversation history to DynamoDB
async function saveConversationHistory(conversationId, history) {
  if (!conversationId) return;

  try {
    const command = new DynamoDBPutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        conversationId: { S: conversationId },
        history: { S: JSON.stringify(history) },
        updatedAt: { S: new Date().toISOString() },
      },
    });

    await dynamoDbClient.send(command);
  } catch (error) {
    console.error("Could not save conversation history:", error);
  }
}

// Node 1: Load conversation history
async function loadHistoryNode(state) {
  let history = [];
  if (state.conversationId) {
    history = await getConversationHistory(state.conversationId);
  }
  return { ...state, history };
}

// Node 2: Agent reasoning with tools
async function agentNode(state) {
  // Initialize tools
  const calculator = new Calculator();
  const search = new DuckDuckGoSearchResults();

  // We'll implement a simple ReAct-like agent:
  // If the input looks like a math question, use calculator
  // If it looks like a question requiring current info, use search
  // Otherwise, just respond directly

  let output = "";
  let toolUsed = "";

  // Simple heuristic for tool selection (in practice, you'd use a more sophisticated approach)
  const mathPatterns = /[\d+\-*/().%^]+/;
  const questionPatterns = /^(what|who|where|when|why|how)\s/i;

  if (mathPatterns.test(state.input) && !questionPatterns.test(state.input)) {
    try {
      const result = await calculator.invoke({ expression: state.input });
      output = result;
      toolUsed = "calculator";
    } catch (error) {
      output = `Sorry, I couldn't calculate that: ${error.message}`;
    }
  } else if (questionPatterns.test(state.input)) {
    try {
      const result = await search.invoke({ query: state.input });
      output = result;
      toolUsed = "duckduckgo_search";
    } catch (error) {
      output = `Sorry, I couldn't search for that: ${error.message}`;
    }
  } else {
    // Fallback response
    output = `I received your message: "${state.input}". I can help with calculations or answer questions by searching the web. Try asking me something like "What is 15*24?" or "What's the weather like today?"`;
  }

  // Update history
  const newHistory = [
    ...(state.history || []),
    { role: "user", content: state.input },
    { role: "assistant", content: output, tool: toolUsed }
  ];

  return {
    ...state,
    output,
    history: newHistory,
    intermediateSteps: [...(state.intermediateSteps || []), { tool: toolUsed, result: output }]
  };
}

// Node 3: Save conversation history
async function saveHistoryNode(state) {
  await saveConversationHistory(state.conversationId, state.history);
  return state; // Just pass through after saving
}

// Create the StateGraph
const workflow = new StateGraph(agentState)
  // Add nodes
  .addNode("loadHistory", loadHistoryNode)
  .addNode("agent", agentNode)
  .addNode("saveHistory", saveHistoryNode)
  // Set entry point
  .setEntryPoint("loadHistory")
  // Add edges
  .addEdge("loadHistory", "agent")
  .addEdge("agent", "saveHistory")
  .addEdge("saveHistory", END);

// Compile the graph into a runnable agent
const agent = workflow.compile();

/**
 * Lambda handler function
 * @param {Object} event - The Lambda event object
 * @param {Object} context - The Lambda context object
 * @returns {Promise<Object>} - The response object
 */
exports.handler = async (event, context) => {
  try {
    // Extract the input and conversationId from the event
    // Assuming API Gateway proxy integration or direct invocation
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // If body is not JSON, treat it as plain text
        body = { input: event.body };
      }
    } else {
      body = event;
    }

    const input = body.input || "";
    const conversationId = body.conversationId || `conv-${Date.now()}`; // Generate if not provided

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide an input message" }),
      };
    }

    // Run the agent with the input and conversationId
    const result = await agent.invoke({
      input: input,
      conversationId: conversationId,
      output: "",
      history: [],
      intermediateSteps: []
    });

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        input: input,
        output: result.output,
        conversationId: result.conversationId, // Echo back so client can use it in next turn
        toolsUsed: result.intermediateSteps.map(step => step.tool).filter(Boolean), // List of tools used
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error in graph handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};