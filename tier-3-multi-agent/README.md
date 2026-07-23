# LangGraph Agent Starter Kit for AWS Lambda (Tier 3)

A confident beginner's guide to building advanced AI agents with multi-agent patterns, human-in-the-loop, and artifact storage using LangGraph on AWS Lambda.

## What This Starter Kit Includes

This kit provides a LangGraph agent that:
- Implements a multi-agent system (supervisor, calculator, researcher, creator)
- Includes human-in-the-loop capabilities for review and intervention
- Stores conversation history in Amazon DynamoDB
- Stores agent-generated artifacts in Amazon S3
- Supports streaming callbacks for real-time UX (placeholder for implementation)
- Exposes a chat interface via AWS Lambda/API Gateway
- Uses AWS SAM for easy deployment
- Includes detailed comments explaining each part

Perfect for developers who have completed Tier 2 or have practical experience with LangGraph and want to explore advanced patterns.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **AWS CLI** configured with appropriate permissions - [Setup guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **AWS SAM CLI** - [Installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
4. An **AWS account** with permissions to create Lambda functions, IAM roles, API Gateway, DynamoDB tables, and S3 buckets

## Project Structure

```
langgraph-lambda-starter-tier3/
├── src/
│   ├── handlers/
│   │   └── graph-handler.js    # Main Lambda handler with multi-agent LangGraph
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

1. **Multi-Agent System**: The agent uses a StateGraph with a supervisor node that routes tasks to specialist agents:
   - `supervisor`: Routes input to appropriate specialist based on content analysis
   - `calculator`: Handles mathematical computations
   - `researcher`: Answers questions using web search
   - `creator`: Acknowledges creative requests and generates artifacts
   - `humanInput`: Placeholder for human-in-the-loop review
   - `saveHistory`: Persists conversation history to DynamoDB

2. **Memory Management**: Conversation history is stored in DynamoDB with:
   - `conversationId` as the primary key
   - History stored as a JSON string
   - Automatic cleanup via TTL (7 days)

3. **Artifact Storage**: Creative requests and other outputs can be stored as artifacts in S3:
   - Each artifact gets a unique key
   - Bucket versioning and lifecycle policies enabled
   - 30-day expiration for artifacts

4. **Human-in-the-Loop**: Placeholder for integrating human review:
   - `needsHumanInput` flag can be set by any agent
   - Flow pauses at `humanInput` node before saving history
   - In production, this would integrate with notification systems (Slack, email, etc.)

5. **Lambda Function**: Serves as the compute platform with:
   - Increased timeout (30s) and memory (2048MB) for complex agent workflows
   - Environment variables pointing to DynamoDB table and S3 bucket
   - IAM policies for necessary service access

6. **API Gateway**: Exposes the Lambda function as an HTTP endpoint at `/chat` (POST)

7. **AWS SAM**: Simplifies deployment and management of serverless resources

## Step-by-Step Setup Guide

### 1. Clone or Download This Starter Kit

If you're viewing this on GitHub, you can clone the repository:
```bash
git clone [repository-url]
cd langgraph-lambda-starter-tier3
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
echo '{"input": "What is 15*24?"}' > events/event.json

# Invoke the function locally
npm run invoke-local
```

You should see output similar to:
```json
{
  "statusCode": 200,
  "body": "{\"input\":\"What is 15*24?\",\"output\":\"360\",\"conversationId\":\"conv-1234567890\",\"agentsUsed\":[\"supervisor\",\"calculator\"],\"artifacts\":[],\"intermediateSteps\":[{\"agent\":\"supervisor\",\"action\":\"route\",\"target\":\"calculator\",\"input\":\"What is 15*24?\"},{\"agent\":\"calculator\",\"action\":\"calculate\",\"result\":\"360\"}],\"timestamp\":\"2024-01-01T12:00:00.000Z\",\"needsHumanInput\":false}"
}
```

### 4. Deploy to AWS

```bash
# First-time deployment (will prompt for configuration)
npm run deploy
```

The deployment process will ask you:
- Stack name (e.g., langgraph-starter-kit-tier3)
- AWS Region (e.g., us-east-1)
- Confirm changes before deploying (type `y` and press Enter)
- Allow SAM CLI IAM role creation (type `y` and press Enter)
- Save arguments to samconfig.toml (type `y` and press Enter)

### 5. Test Your Deployed Agent

After successful deployment, you'll see output like:
```
Outputs
GraphHandlerApi: https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/
GraphHandlerFunction: arn:aws:lambda:us-east-1:123456789012:function:langgraph-starter-kit-tier3-GraphHandlerFunction-XXXXXXX
ConversationsTableName: LangGraphConversations
ArtifactBucketName: langgraph-starter-kit-tier3-artifacts-us-east-1
```

Test your agent using curl:
```bash
# Mathematical question
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 15*24?"}'

# Research question
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the capital of France?"}'

# Creative request
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a poem about sunsets"}'

# Multi-turn conversation (using conversationId from previous response)
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/chat/ \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the square root of that result?", "conversationId": "conv-1234567890"}'
```

## Understanding the Code

### src/handlers/graph-handler.js

This file contains:
1. **State Definition**: Object with fields for input, conversationId, output, intermediateSteps, currentAgent, needsHumanInput, artifacts, and streamCallback
2. **Multi-Agent Routing**: Supervisor node analyzes input and routes to appropriate specialist
3. **Specialist Agents**:
   - Calculator: Uses LangChain Calculator tool for math
   - Researcher: Uses DuckDuckGo Search for questions
   - Creator: Acknowledges creative requests and simulates artifact creation
   - HumanInput: Placeholder for human review (sets needsHumanInput flag)
4. **Persistence**: saveHistory node stores conversation to DynamoDB
5. **Lambda Handler**:
   - Extracts input, conversationId, and optional streamCallback
   - Invokes the LangGraph agent
   - Returns detailed response including agents used, artifacts, and intermediate steps

### template.yaml

This AWS SAM template defines:
- A DynamoDB table (`LangGraphConversations`) for conversation history
- An S3 bucket (auto-generated name) for storing agent artifacts
- A Lambda function (`GraphHandlerFunction`) with:
  - Node.js 18 runtime
  - 2048MB memory and 30-second timeout (for complex workflows)
  - Environment variables for DynamoDB table and S3 bucket
  - IAM policies for DynamoDB and S3 access
- API Gateway endpoint at `/chat` (POST method)

## Common Issues and Troubleshooting

### "Cannot find module '@langchain/langgraph'"
- Solution: Run `npm install` to install dependencies

### "Access Denied" errors during deployment
- Solution: Ensure your AWS CLI user has permissions for Lambda, IAM, API Gateway, DynamoDB, and S3

### Function returns 500 error
- Solution: Check CloudWatch logs for your Lambda function:
  ```bash
  sam logs -n GraphHandlerFunction
  ```

### DynamoDB or S3 errors
- Solution: Verify the resources were created correctly and the Lambda function has appropriate permissions
- Check that the environment variables in the Lambda match the deployed resources

### No conversation history persistence
- Solution: Check that:
  1. The DynamoDB table exists
  2. The Lambda function has write permissions
  3. The conversationId is being passed correctly between requests

### Artifacts not appearing in S3
- Solution: Verify:
  1. The S3 bucket exists and is accessible
  2. The Lambda function has s3:PutObject permission
  3. The artifact key is being generated correctly

## Next Steps After This Starter Kit

Once you're comfortable with this example, consider exploring:

1. **Production Enhancements**:
   - Implement real human-in-the-loop with Slack/email notifications
   - Add WebSocket support for true streaming responses
   - Implement agent memory optimization (summarization, etc.)
   - Add comprehensive error handling and retry patterns
   - Integrate with AWS Bedrock or other foundation models

2. **Advanced LangGraph Concepts**:
   - Dynamic agent creation based on task complexity
   - Agent communication protocols (message passing)
   - Hierarchical agent teams
   - Adaptive routing based on past performance
   - Agent self-improvement through feedback loops

3. **AWS Integration Patterns**:
   - Event-driven architecture with SNS/SQS for agent communication
   - Step Functions for complex workflow orchestration
   - CloudWatch custom metrics and alarms
   - X-Ray tracing for distributed debugging
   - Parameter Store or Secrets Manager for configuration and API keys

4. **Use Case Specialization**:
   - Customer support escalation workflows
   - Research paper generation and review systems
   - Creative content production pipelines
   - Data analysis and reporting agents
   - Workflow automation for business processes

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [LangChain.js Tools Documentation](https://js.langchain.com/docs/modules/agents/tools/)
- [Amazon DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
- [Amazon S3 Developer Guide](https://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## License

This starter kit is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions, please:
1. Check the troubleshooting section above
2. Review the LangGraph and AWS documentation
3. Feel free to open an issue in the repository (if applicable)

Happy building! 🚀