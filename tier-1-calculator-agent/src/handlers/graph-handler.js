const { StateGraph, END } = require("@langchain/langgraph");
const { Calculator } = require("@langchain/community/tools/calculator");

// Define the state for our agent
// In this simple example, we'll just pass through the input and output
const agentState = {
  // Input from Lambda event
  input: "",
  // Output from the agent
  output: "",
};

// Create a new StateGraph
const workflow = new StateGraph(agentState)
  // Add a node that uses the calculator tool
  .addNode("calculate", async (state) => {
    // Initialize the calculator tool
    const calculator = new Calculator();
    try {
      // Use the tool to calculate the result of the input expression
      const result = await calculator.invoke({ expression: state.input });
      return { ...state, output: result };
    } catch (error) {
      return { ...state, output: `Error: ${error.message}` };
    }
  })
  // Set the entry point
  .setEntryPoint("calculate")
  // After the calculate node, end the workflow
  .addEdge("calculate", END);

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
    // Extract the input from the event (assuming API Gateway or direct invocation)
    const input = event.body ? JSON.parse(event.body).input : event.input || "";

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide an input expression to calculate" }),
      };
    }

    // Run the agent with the input
    const result = await agent.invoke({ input: input, output: "" });

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        input: input,
        output: result.output,
      }),
    };
  } catch (error) {
    console.error("Error in graph handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};