const { StateGraph, END, START } = require("@langchain/langgraph");
const { Calculator } = require("@langchain/community/tools/calculator");
const { DuckDuckGoSearchResults } = require("@langchain/community/tools/ddg_search");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBSaver } = require("@langchain/langgraph-checkpoint/dynamodb");

// Configuration
const TABLE_NAME = process.env.CONVERSATION_TABLE || "LangGraphConversations";

// Initialize AWS clients
const dynamoDbClient = new DynamoDBClient({});

// Initialize the DynamoDB checkpointer
const checkpointer = new DynamoDBSaver({
  client: dynamoDbClient,
  tableName: TABLE_NAME,
});

// Define the state for our agent with memory
const agentState = {
  channels: {
    input: { value: "", update: (a, b) => b },
    conversationId: { value: "", update: (a, b) => b },
    output: { value: "", update: (a, b) => b },
    history: { value: [], update: (a, b) => b },
    intermediateSteps: { value: [], update: (a, b) => b }
  }
};

// Node 1: Load conversation history (handled automatically by checkpointer)
// Node 2: Agent reasoning with tools
async function agentNode(state) {
  // Initialize tools
  const calculator = new Calculator();
  const search = new DuckDuckGoSearchResults();

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

// Node 3: Save conversation history (handled automatically by checkpointer)
async function saveHistoryNode(state) {
  // The checkpointer automatically saves state after each node
  // This node is a no-op but kept for clarity in the graph
  return state;
}

// Create the StateGraph with checkpointer
const workflow = new StateGraph({
  channels: {
    input: { value: "", update: (a, b) => b },
    conversationId: { value: "", update: (a, b) => b },
    output: { value: "", update: (a, b) => b },
    history: { value: [], update: (a, b) => b },
    intermediateSteps: { value: [], update: (a, b) => b }
  }
})
  // The checkpointer automatically handles loading/saving state
  .addNode("agent", agentNode)
  .addNode("saveHistory", saveHistoryNode)
  .addEdge(START, "agent")
  .addEdge("agent", "saveHistory")
  .addEdge("saveHistory", END);

// Compile the graph with checkpointer for automatic persistence
const agent = workflow.compile({
  checkpointer
});

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
    // The checkpointer will automatically load/save state based on conversationId
    const config = {
      configurable: {
        thread_id: conversationId,
      },
    };

    const result = await agent.invoke({
      input: input,
      conversationId: conversationId,
      output: "",
      history: [],
      intermediateSteps: []
    }, config);

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