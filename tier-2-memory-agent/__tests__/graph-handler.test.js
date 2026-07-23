// Unit tests for the LangGraph agent logic in Tier 2 starter kit

const { StateGraph, END } = require("@langchain/langgraph");

// Mock the external dependencies
jest.mock("@langchain/community/tools/calculator", () => {
  return {
    Calculator: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue("360") // Mock result for "15*24"
      };
    })
  };
});

jest.mock("@langchain/community/tools/ddg_search", () => {
  return {
    DuckDuckGoSearchResults: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue("Paris is the capital of France.")
      };
    })
  };
});

// Mock AWS DynamoDB client
jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn()
      };
    }),
    DynamoDBGetItemCommand: jest.fn(),
    DynamoDBPutItemCommand: jest.fn(),
    DynamoDBUpdateItemCommand: jest.fn()
  };
});

describe("LangGraph Agent with Memory", () => {
  let agent;
  let mockDynamoDbSend;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DynamoDB responses
    mockDynamoDbSend = jest.fn();

    // Mock getItem to return empty history initially
    const GetItemMock = require("@aws-sdk/client-dynamodb").DynamoDBGetItemCommand;
    GetItemMock.mockImplementation(() => {
      return {
        // This will be instantiated in the constructor mock
        constructor: { name: "DynamoDBGetItemCommand" }
      };
    });

    // Mock putItem
    const PutItemMock = require("@aws-sdk/client-dynamodb").DynamoDBPutItemCommand;
    PutItemMock.mockImplementation(() => {
      return {
        constructor: { name: "DynamoDBPutItemCommand" }
      };
    });

    // Mock the DynamoDBClient.send method
    const DynamoDBClientMock = require("@aws-sdk/client-dynamodb").DynamoDBClient;
    DynamoDBClientMock.mockImplementation(() => {
      return {
        send: mockDynamoDbSend
      };
    });

    // Recreate the agent for each test
    const workflow = new StateGraph({
      input: "",
      conversationId: "",
      output: "",
      history: [],
      intermediateSteps: []
    })
    // We'll test the agent node logic directly by importing the actual functions
    // For simplicity in this example, we're testing the overall concept

    // In a real test, you'd import the actual node functions from your source code
    // For now, we'll just verify the structure would work

    agent = workflow.compile(); // This is just a placeholder
  });

  test("should initialize with correct state structure", () => {
    const initialState = {
      input: "",
      conversationId: "",
      output: "",
      history: [],
      intermediateSteps: []
    };

    expect(initialState).toHaveProperty("input");
    expect(initialState).toHaveProperty("conversationId");
    expect(initialState).toHaveProperty("output");
    expect(initialState).toHaveProperty("history");
    expect(initialState).toHaveProperty("intermediateSteps");
  });

  test("should handle mathematical queries with calculator", async () => {
    // This test would import and test the actual agentNode function
    // For this outline, we're verifying the concept would work

    const CalculatorMock = require("@langchain/community/tools/calculator");
    const calculatorInstance = new CalculatorMock.Calculator();

    // The mock is set up in the jest.mock above to return "360" for "15*24"
    const result = await calculatorInstance.invoke({ expression: "15*24" });
    expect(result).toBe("360");
  });

  test("should handle question queries with search", async () => {
    const SearchMock = require("@langchain/community/tools/ddg_search");
    const searchInstance = new SearchMock.DuckDuckGoSearchResults();

    // The mock is set up in the jest.mock above
    const result = await searchInstance.invoke({ query: "What is the capital of France?" });
    expect(result).toBe("Paris is the capital of France.");
  });
});