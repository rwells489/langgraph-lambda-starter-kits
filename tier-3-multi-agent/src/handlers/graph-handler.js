const { StateGraph, END } = require("@langchain/langgraph");
const { Calculator } = require("@langchain/community/tools/calculator");
const { DuckDuckGoSearchResults } = require("@langchain/community/tools/ddg_search");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBPutItemCommand, DynamoDBGetItemCommand, DynamoDBUpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

// Configuration
const TABLE_NAME = process.env.CONVERSATION_TABLE || "LangGraphConversations";
const BUCKET_NAME = process.env.ARTIFACT_BUCKET || "langgraph-agent-artifacts";

// Initialize AWS clients
const dynamoDbClient = new DynamoDBClient({});
const s3Client = new S3Client({});

// Define the state for our agent with advanced features
const agentState = {
  // Input from Lambda event
  input: "",
  // Conversation ID for memory
  conversationId: "",
  // Output from the agent
  output: "",
  // For debugging and tracking
  intermediateSteps: [],
  // Current agent in a multi-agent system
  currentAgent: "supervisor",
  // Flag for human-in-the-loop
  needsHumanInput: false,
  // Artifacts generated (file paths, etc.)
  artifacts: [],
  // Streaming callback (for real-time UX)
  streamCallback: null
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
        ttl: { N: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }.toString() // 7 days TTL
      },
    });

    await dynamoDbClient.send(command);
  } catch (error) {
    console.error("Could not save conversation history:", error);
  }
}

// Helper function to save an artifact to S3
async def saveArtifactToS3(artifactKey, artifactContent) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: artifactKey,
      Body: artifactContent,
      ContentType: "application/json"
    });

    await s3Client.send(command);
    return `s3://${BUCKET_NAME}/${artifactKey}`;
  } catch (error) {
    console.error("Could not save artifact to S3:", error);
    return null;
  }
}

// Supervisor Agent: Routes tasks to appropriate specialist agents
async function supervisorNode(state) {
  const { input } = state;

  // Simple routing logic - in practice, this could be more sophisticated
  const mathPatterns = /[\d+\-*/().%^]+/;
  const questionPatterns = /^(what|who|where|when|why|how)\s/i;
  const creativePatterns = /^(write|create|generate|compose|design)\s/i;

  let nextAgent = "researcher"; // Default

  if (mathPatterns.test(input) && !questionPatterns.test(input)) {
    nextAgent = "calculator";
  } else if (questionPatterns.test(input)) {
    nextAgent = "researcher";
  } else if (creativePatterns.test(input)) {
    nextAgent = "creator";
  }

  // Add step to intermediate steps
  const newSteps = [
    ...(state.intermediateSteps || []),
    { agent: "supervisor", action: "route", target: nextAgent, input }
  ];

  return {
    ...state,
    currentAgent: nextAgent,
    intermediateSteps: newSteps
  };
}

// Calculator Agent: Handles mathematical computations
async function calculatorNode(state) {
  const calculator = new Calculator();

  try {
    const result = await calculator.invoke({ expression: state.input });
    const output = result;

    const newSteps = [
      ...(state.intermediateSteps || []),
      { agent: "calculator", action: "calculate", result: output }
    ];

    return {
      ...state,
      output,
      intermediateSteps: newSteps,
      currentAgent: "supervisor" // Return to supervisor after task
    };
  } catch (error) {
    const output = `Sorry, I couldn't calculate that: ${error.message}`;

    const newSteps = [
      ...(state.intermediateSteps || []),
      { agent: "calculator", action: "calculate", error: error.message }
    ];

    return {
      ...state,
      output,
      intermediateSteps: newSteps,
      currentAgent: "supervisor"
    };
  }
}

// Researcher Agent: Uses search to answer questions
async function researcherNode(state) {
  const search = new DuckDuckGoSearchResults();

  try {
    const result = await search.invoke({ query: state.input });
    const output = result;

    const newSteps = [
      ...(state.intermediateSteps || []),
      { agent: "researcher", action: "search", result: output }
    ];

    return {
      ...state,
      output,
      intermediateSteps: newSteps,
      currentAgent: "supervisor"
    };
  } catch (error) {
    const output = `Sorry, I couldn't search for that: ${error.message}`;

    const newSteps = [
      ...(state.intermediateSteps || []),
      { agent: "researcher", action: "search", error: error.message }
    ];

    return {
      ...state,
      output,
      intermediateSteps: newSteps,
      currentAgent: "supervisor"
    };
  }
}

// Creator Agent: Handles creative tasks (simplified example)
async function creatorNode(state) {
  // In a real implementation, this might use an LLM for creative tasks
  // For this example, we'll just acknowledge the creative request

  const output = `I understand you want to create something based on: "${state.input}". This is a creative task that would typically involve generating text, designs, or other creative works. For now, I've noted your request.`;

  // Create a simple artifact
  const artifactKey = `creative-requests/${state.conversationId}-${Date.now()}.json`;
  const artifactContent = JSON.stringify({
    request: state.input,
    timestamp: new Date().toISOString(),
    type: "creative"
  });

  // In a real implementation, we'd save this to S3
  // const artifactUrl = await saveArtifactToS3(artifactKey, artifactContent);
  const artifactUrl = `s3://${BUCKET_NAME}/${artifactKey}`; // Simulated

  const newArtifacts = [
    ...(state.artifacts || []),
    {
      key: artifactKey,
      url: artifactUrl,
      type: "creative-request",
      createdAt: new Date().toISOString()
    }
  ];

  const newSteps = [
    ...(state.intermediateSteps || []),
    { agent: "creator", action: "acknowledge", artifact: artifactKey }
  ];

  return {
    ...state,
    output,
    intermediateSteps: newSteps,
    artifacts: newArtifacts,
    currentAgent: "supervisor"
  };
}

// Human-in-the-loop Node: Pauses for human input when needed
async function humanInputNode(state) {
  // In a real implementation, this would integrate with a notification system
  // (e.g., send to Slack, email, or a dashboard) and wait for response

  // For this example, we'll simulate that human input is not needed
  // but show how the flow would work

  const output = state.output || "I've completed the task. Let me know if you need anything else.";

  const newSteps = [
    ...(state.intermediateSteps || []),
    { agent: "human-input", action: "review", output }
  ];

  return {
    ...state,
    output,
    intermediateSteps: newSteps,
    needsHumanInput: false, // Reset flag
    currentAgent: "supervisor"
  };
}

// Save conversation history node
async function saveHistoryNode(state) {
  await saveConversationHistory(state.conversationId, state.history || []);
  return state;
}

// Create the StateGraph with conditional edges
const workflow = new StateGraph(agentState)
  // Add all nodes
  .addNode("supervisor", supervisorNode)
  .addNode("calculator", calculatorNode)
  .addNode("researcher", researcherNode)
  .addNode("creator", creatorNode)
  .addNode("humanInput", humanInputNode)
  .addNode("saveHistory", saveHistoryNode)
  // Set entry point
  .setEntryPoint("supervisor")

  // Add conditional edges from supervisor
  .addConditionalEdges(
    "supervisor",
    (state) => state.currentAgent,
    {
      calculator: "calculator",
      researcher: "researcher",
      creator: "creator",
      supervisor: END // If already at supervisor, end
    }
  )

  // Add edges from worker nodes to human input (if needed) or save history
  .addConditionalEdges(
    "calculator",
    (state) => state.needsHumanInput ? "humanInput" : "saveHistory",
    {
      humanInput: "humanInput",
      saveHistory: "saveHistory"
    }
  )
  .addConditionalEdges(
    "researcher",
    (state) => state.needsHumanInput ? "humanInput" : "saveHistory",
    {
      humanInput: "humanInput",
      saveHistory: "saveHistory"
    }
  )
  .addConditionalEdges(
    "creator",
    (state) => state.needsHumanInput ? "humanInput" : "saveHistory",
    {
      humanInput: "humanInput",
      saveHistory: "saveHistory"
    }
  )

  // Human input goes to save history
  .addEdge("humanInput", "saveHistory")

  // Save history ends the workflow
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
    const streamCallback = body.streamCallback || null; // For streaming support

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
      history: [], // Will be loaded by saveHistory node via getConversationHistory
      intermediateSteps: [],
      currentAgent: "supervisor",
      needsHumanInput: false,
      artifacts: [],
      streamCallback: streamCallback
    });

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        input: input,
        output: result.output,
        conversationId: result.conversationId, // Echo back so client can use it in next turn
        agentsUsed: [...new Set(result.intermediateSteps.map(step => step.agent).filter(Boolean))], // Unique agents used
        artifacts: result.artifacts,
        intermediateSteps: result.intermediateSteps, // For debugging/transparency
        timestamp: new Date().toISOString(),
        needsHumanInput: result.needsHumanInput
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