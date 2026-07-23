# LangGraph Agent Starter Kit for AWS Lambda (Tier 1)

The absolute beginner's guide to building and deploying AI agents with LangGraph on AWS Lambda.

## What This Starter Kit Includes

This kit provides the simplest possible LangGraph agent that:
- Takes a mathematical expression as input
- Uses LangGraph's built-in Calculator tool to compute the result
- Returns the calculation result via AWS Lambda/API Gateway
- Uses AWS SAM for easy deployment
- Includes detailed comments explaining each part

Perfect for developers who are new to both LangGraph and serverless AI agents.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **AWS CLI** configured with appropriate permissions - [Setup guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **AWS SAM CLI** - [Installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
4. An **AWS account** with permissions to create Lambda functions, IAM roles, and API Gateway

## Project Structure

```
langgraph-lambda-starter-tier1/
├── src/
│   └── handlers/
│       └── graph-handler.js    # Main Lambda handler with LangGraph agent
├── template.yaml               # AWS SAM template for deployment
├── package.json                # Node.js dependencies and scripts
├── README.md                   # This file
└── events/
    └── event.json              # Sample event for local testing
```

## How It Works

1. **LangGraph Agent**: The agent uses a simple StateGraph with one node that executes the Calculator tool
2. **Lambda Function**: AWS Lambda serves as the compute platform for our agent
3. **API Gateway**: Exposes the Lambda function as an HTTP endpoint
4. **AWS SAM**: Simplifies deployment and management of serverless resources

## Step-by-Step Setup Guide

### 1. Clone or Download This Starter Kit

If you're viewing this on GitHub, you can clone the repository:
```bash
git clone [repository-url]
cd langgraph-lambda-starter-tier1
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
echo '{"input": "2 + 2"}' > events/event.json

# Invoke the function locally
npm run invoke-local
```

You should see output similar to:
```json
{
  "statusCode": 200,
  "body": "{\"input\":\"2 + 2\",\"output\":\"4\"}"
}
```

### 4. Deploy to AWS

```bash
# First-time deployment (will prompt for configuration)
npm run deploy
```

The deployment process will ask you:
- Stack name (e.g., langgraph-starter-kit)
- AWS Region (e.g., us-east-1)
- Confirm changes before deploying (type `y` and press Enter)
- Allow SAM CLI IAM role creation (type `y` and press Enter)
- Save arguments to samconfig.toml (type `y` and press Enter)

### 5. Test Your Deployed Agent

After successful deployment, you'll see output like:
```
Outputs
GraphHandlerApi: https://abcdefg123.execute-api.us-east-1.amazonaws.com/calculate/
GraphHandlerFunction: arn:aws:lambda:us-east-1:123456789012:function:langgraph-starter-kit-GraphHandlerFunction-XXXXXXX
```

Test your agent using curl:
```bash
curl -X POST \
  https://abcdefg123.execute-api.us-east-1.amazonaws.com/calculate/ \
  -H "Content-Type: application/json" \
  -d '{"input": "sqrt(144)"}'
```

Expected response:
```json
{
  "input": "sqrt(144)",
  "output": "12"
}
```

## Understanding the Code

### src/handlers/graph-handler.js

This file contains:
1. **State Definition**: Simple object with `input` and `output` properties
2. **Graph Construction**: 
   - Creates a StateGraph with our state definition
   - Adds a "calculate" node that uses the Calculator tool
   - Sets the entry point and defines the flow (calculate → END)
3. **Lambda Handler**:
   - Extracts input from the event
   - Invokes the LangGraph agent
   - Returns formatted response

### template.yaml

This AWS SAM template defines:
- A single Lambda function (`GraphHandlerFunction`)
- Node.js 18 runtime with 1024MB memory and 10-second timeout
- API Gateway endpoint at `/calculate` (POST method)
- Automatic IAM role creation with necessary permissions

## Common Issues and Troubleshooting

### "Cannot find module '@langchain/langgraph'"
- Solution: Run `npm install` to install dependencies

### "Access Denied" errors during deployment
- Solution: Ensure your AWS CLI user has `AWSLambdaFullAccess`, `IAMFullAccess`, and `APIGatewayAdministrator` permissions

### Function returns 500 error
- Solution: Check CloudWatch logs for your Lambda function:
  ```bash
  sam logs -n GraphHandlerFunction
  ```

### API Gateway returns {"message": "Internal server error"}
- Solution: Check Lambda function logs for detailed error information

## Next Steps After This Starter Kit

Once you're comfortable with this basic example, consider exploring:

1. **Tier 2 Starter Kit** (coming soon): 
   - Multiple tools (web search, data fetching)
   - Conversation memory with DynamoDB
   - More complex agent patterns

2. **LangGraph Concepts to Learn**:
   - State persistence and checkpointers
   - Conditional edges and routing
   - Human-in-the-loop interrupts
   - Multi-agent systems (supervisor/worker patterns)

3. **AWS Enhancements**:
   - Environment variables for configuration
   - Lambda layers for dependency management
   - X-Ray tracing for debugging
   - CloudWatch alarms and metrics

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [LangChain.js Calculator Tool](https://js.langchain.com/docs/modules/agents/tools/integrations/calculator)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## License

This starter kit is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions, please:
1. Check the troubleshooting section above
2. Review the LangGraph and AWS documentation
3. Feel free to open an issue in the repository (if applicable)

Happy building! 🚀