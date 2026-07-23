# LangGraph Agent Starter Kit for AWS Lambda (Tier 2)

A practical beginner's guide to building AI agents with memory and multiple tools using LangGraph on AWS Lambda.

## What This Starter Kit Includes

This kit provides a LangGraph agent that:
- Uses multiple tools (Calculator and DuckDuckGo Search)
- Persists conversation history in Amazon DynamoDB
- Handles conversational context with automatic history loading/saving
- Exposes a chat interface via AWS Lambda/API Gateway
- Uses AWS SAM for easy deployment
- Includes detailed comments explaining each part

Perfect for developers who have completed Tier 1 or have basic familiarity with LangGraph and want to add memory and more capabilities.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **AWS CLI** configured with appropriate permissions - [Setup guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **AWS SAM CLI** - [Installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
4. An **AWS account** with permissions to create Lambda functions, IAM roles, API Gateway, and DynamoDB tables

## Project Structure

```
langgraph-lambda-starter-tier2/
├── src/
│   ├── handlers/
│   │   └── graph-handler.js    # Main Lambda handler with LangGraph agent
│   └── lib/                    # Shared utilities (placeholder for expansion)
├── infrastructure/
│   ├── template.yaml           # AWS SAM template for deployment
│   └── parameters/
│       ├── dev.json
│       └── prod.json
├── tests/
│   ├── unit/
│   └── integration/
├── events/
│   └── event.json              # Sample event for local testing
├── package.json                # Node.js dependencies and scripts
├── README.md                   # This file
└── LICENSE                     # MIT license
```

## How It Works

1. **LangGraph Agent**: The agent uses a StateGraph with three nodes:
   - `loadHistory`: Retrieves conversation history from DynamoDB
   - `agent`: Processes input using tools (Calculator for math, DuckDuckGo Search for questions)
   - `saveHistory`: Saves updated conversation history back to DynamoDB

2. **Memory Management**: Conversation history is stored in DynamoDB with:
   - `conversationId` as the primary key
   - History stored as a JSON string
   - Automatic cleanup via TTL (optional)

3. **Tool Selection**: Simple heuristic-based routing:
   - Mathematical expressions → Calculator
   - Questions (starting with what/who/where/etc.) → DuckDuckGo Search
   - Everything else → Direct response

4. **Lambda Function**: AWS Lambda serves as the compute platform
5. **API Gateway**: Exposes the Lambda function as an HTTP endpoint
6. **AWS SAM**: Simplifies deployment and management of serverless resources

## Step-by-Step Setup Guide

### 1. Clone or Download This Starter Kit

If you're viewing this on GitHub, you can clone the repository:
```bash
git clone [repository-url]
cd langgraph-lambda-starter-tier2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test Locally (Optional but Recommended)

Before deploying to AWS, test your function locally:

```bash
# Create a sample event if events/event.json doesn't exist
mkdir -p events
echo '{"input": "What is the capital of France?"}' > events/event.json

# Invoke the function locally
npm run invoke-local
```

You should see output similar to (note: actual search results will vary):
```json
{
  "statusCode": 200,
  "body": "{\"input\":\"What is the capital of France?\",\"output\":\"The capital of France is Paris.\",\"conversationId\":\"conv-1234567890\",\"toolsUsed\":[\"duckduckgo_search\"],\"timestamp\":\"2024-01-01T12:00:00.000Z\"}"
}
```

### 4. Deploy to AWS

```bash
# First-time deployment (will prompt for configuration)
npm run deploy
```

The deployment process will ask you:
- Stack name (e.g., langgraph-starter-kit-tier2)
- AWS Region (e.g., us-east-1)
- Confirm changes before deploying (type `y` and press Enter)
- Allow SAM CLI IAM role creation (type `y` and press Enter)
- Save arguments to samconfig.toml (type `y` and press Enter)

### 5. Test Your Deployed Agent

After successful deployment, you'll see output like:
```
Outputs
GraphHandlerApi: https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/
GraphHandlerFunction: arn:aws:lambda:us-east-1:123456789012:function:langgraph-starter-kit-tier2-GraphHandlerFunction-XXXXXXX
ConversationsTableName: LangGraphConversations
```

Test your agent using curl:
```bash
# First message (no conversationId - will be generated)
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 15*24?"}'

# Second message (using the conversationId from first response)
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the square root of that result?", "conversationId": "conv-1234567890"}'
```

## Understanding the Code

### src/handlers/graph-handler.js

This file contains:
1. **State Definition**: Object with `input`, `conversationId`, `output`, `history`, and `intermediateSteps`
2. **History Management**: Functions to load/save conversation history from/to DynamoDB
3. **Graph Construction**: 
   - Three nodes: loadHistory → agent → saveHistory
   - Agent node implements simple tool selection heuristics
4. **Lambda Handler**:
   - Extracts input and conversationId from the event
   - Invokes the LangGraph agent
   - Returns formatted response including conversationId for continuity

### template.yaml

This AWS SAM template defines:
- A DynamoDB table (`LangGraphConversations`) for storing conversation history
- A Lambda function (`GraphHandlerFunction`) with:
  - Node.js 18 runtime
  - 1536MB memory and 15-second timeout (increased for tool usage)
  - Environment variable pointing to the DynamoDB table
  - IAM policies for DynamoDB read/write access
- API Gateway endpoint at `/chat` (POST method)

## Common Issues and Troubleshooting

### "Cannot find module '@langchain/langgraph'"
- Solution: Run `npm install` to install dependencies

### "Access Denied" errors during deployment
- Solution: Ensure your AWS CLI user has permissions for Lambda, IAM, API Gateway, and DynamoDB

### Function returns 500 error
- Solution: Check CloudWatch logs for your Lambda function:
  ```bash
  sam logs -n GraphHandlerFunction
  ```

### DynamoDB errors
- Solution: Verify the table was created correctly and the Lambda function has permissions
- Check that the table name in the environment variable matches the DynamoDB table

### No conversation history persistence
- Solution: Check that:
  1. The DynamoDB table exists
  2. The Lambda function has write permissions
  3. The conversationId is being passed correctly between requests

## Next Steps After This Starter Kit

Once you're comfortable with this example, consider exploring:

1. **Tier 3 Starter Kit** (conceptual): 
   - Multi-agent patterns (supervisor/worker)
   - Human-in-the-loop interrupts
   - Streaming responses for better UX
   - Integration with AWS Bedrock or other ML services

2. **LangGraph Concepts to Learn**:
   - Advanced state persistence (checkpointers)
   - Conditional edges and complex routing
   - Agent memory optimization
   - Error handling and retry patterns

3. **AWS Enhancements**:
   - Environment-specific configurations (dev/stage/prod)
   - Lambda layers for dependency management
   - X-Ray tracing for debugging
   - CloudWatch alarms and metrics
   - API Gateway throttling and caching
   - Using AWS Secrets Manager for API keys (if adding external API tools)

4. **Tool Expansion**:
   - Add more specialized tools (Python REPL, file operations, custom APIs)
   - Create custom tools tailored to your use case
   - Implement tool chaining and verification

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [LangChain.js Tools Documentation](https://js.langchain.com/docs/modules/agents/tools/)
- [Amazon DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## License

This starter kit is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions, please:
1. Check the troubleshooting section above
2. Review the LangGraph and AWS documentation
3. Feel free to open an issue in the repository (if applicable)

Happy building! 🚀