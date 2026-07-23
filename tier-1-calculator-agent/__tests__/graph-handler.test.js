// Simple unit test for the graph handler logic
// Note: This is a simplified example - in practice, you'd want more comprehensive tests

const { StateGraph, END } = require("@langchain/langgraph");
const { Calculator } = require("@langchain/community/tools/calculator");

// Mock the Calculator tool for testing
jest.mock("@langchain/community/tools/calculator", () => {
  return {
    Calculator: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue("4") // Mock result for "2 + 2"
      };
    })
  };
});

describe("LangGraph Agent Logic", () => {
  let agent;

  beforeEach(() => {
    // Recreate the agent for each test - matches the actual handler's error handling
    const workflow = new StateGraph({
      channels: {
        input: { value: "", update: (a, b) => b },
        output: { value: "", update: (a, b) => b }
      }
    })
    .addNode("calculate", async (state) => {
      const calculator = new Calculator();
      try {
        const result = await calculator.invoke({ expression: state.input });
        return { ...state, output: result };
      } catch (error) {
        return { ...state, output: `Error: ${error.message}` };
      }
    })
    .setEntryPoint("calculate")
    .addEdge("calculate", END);

    agent = workflow.compile();
  });

  test("should process a simple calculation", async () => {
    const result = await agent.invoke({ input: "2 + 2", output: "" });
    expect(result.output).toBe("4");
  });

  test("should handle invalid input gracefully", async () => {
    // Reset mock to reject
    const CalculatorMock = require("@langchain/community/tools/calculator");
    CalculatorMock.Calculator.mockImplementation(() => {
      return {
        invoke: jest.fn().mockRejectedValue(new Error("Invalid expression"))
      };
    });

    const result = await agent.invoke({ input: "invalid math", output: "" });
    expect(result.output).toMatch(/Error/);
  });
});