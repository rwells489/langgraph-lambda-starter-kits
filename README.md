# LangGraph Lambda Starter Kits

> **Three progressive tiers** of LangGraph agents on AWS Lambda — from absolute beginner to multi-agent systems. Originally commercial products on Gumroad, now open-source to help developers build serverless AI agents the right way.

[![Deploy Tier 1](https://img.shields.io/badge/Deploy-Tier%201-orange?style=for-the-badge&logo=amazon-aws)](https://github.com/rainawells/langgraph-lambda-starter-kits/tree/main/tier-1-calculator-agent)
[![Deploy Tier 2](https://img.shields.io/badge/Deploy-Tier%202-blue?style=for-the-badge&logo=amazon-aws)](https://github.com/rainawells/langgraph-lambda-starter-kits/tree/main/tier-2-memory-agent)
[![Deploy Tier 3](https://img.shields.io/badge/Deploy-Tier%203-purple?style=for-the-badge&logo=amazon-aws)](https://github.com/rainawells/langgraph-lambda-starter-kits/tree/main/tier-3-multi-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

---

## 🎯 Which Tier Should You Start With?

| Tier | Level | What You'll Build | Key Concepts | Est. Deploy Time |
|------|-------|-------------------|--------------|------------------|
| **[Tier 1](tier-1-calculator-agent)** | 🟢 Beginner | Calculator agent — takes math expressions, returns results | LangGraph basics, StateGraph, single tool, SAM deployment | 5 min |
| **[Tier 2](tier-2-memory-agent)** | 🟡 Intermediate | Chat agent with memory — Calculator + Web Search, remembers conversation history | Multiple tools, DynamoDB persistence, tool routing heuristics | 10 min |
| **[Tier 3](tier-3-multi-agent)** | 🔴 Advanced | Multi-agent system — Supervisor routes to Calculator/Researcher/Creator, S3 artifacts, HITL placeholder | Supervisor pattern, conditional edges, S3 artifacts, TTL cleanup, human-in-the-loop | 15 min |

> **New to LangGraph?** Start with **Tier 1**. Each tier builds on the previous one.

---

## 🚀 Quick Start (Any Tier)

```bash
# 1. Clone the repo
git clone https://github.com/rainawells/langgraph-lambda-starter-kits.git
cd langgraph-lambda-starter-kits

# 2. Pick your tier
cd tier-1-calculator-agent  # or tier-2-memory-agent / tier-3-multi-agent

# 3. Install dependencies
npm install

# 4. Test locally (requires SAM CLI)
npm run invoke-local

# 5. Deploy to AWS (requires AWS CLI + SAM CLI configured)
npm run deploy
```

**Prerequisites:**
- Node.js 18+
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed
- AWS account with permissions for Lambda, API Gateway, DynamoDB, S3, IAM

---

## 📁 Repository Structure

```
langgraph-lambda-starter-kits/
├── .github/
│   ├── workflows/
│   │   └── deploy-all.yml      # CI/CD: test + deploy all 3 tiers to dev/staging/prod
│   └── FUNDING.yml             # GitHub Sponsors / Ko-fi / Gumroad links
├── tier-1-calculator-agent/    # Beginner: Single tool, no memory
│   ├── src/handlers/graph-handler.js
│   ├── template.yaml           # SAM: Lambda + API Gateway
│   ├── package.json
│   ├── events/event.json       # Local test event
│   └── README.md
├── tier-2-memory-agent/        # Intermediate: Tools + DynamoDB memory
│   ├── src/handlers/graph-handler.js
│   ├── template.yaml           # SAM: Lambda + API GW + DynamoDB
│   ├── package.json
│   ├── events/event.json
│   └── README.md
├── tier-3-multi-agent/         # Advanced: Supervisor + specialists + S3 + HITL
│   ├── src/handlers/graph-handler.js
│   ├── template.yaml           # SAM: Lambda + API GW + DynamoDB + S3
│   ├── package.json
│   ├── events/event.json
│   └── README.md
└── shared/                     # (Future) CDK constructs, shared utilities
```

---

## 🏗️ Architecture Overview

### Tier 1: Single Tool
```
POST /calculate → API Gateway → Lambda (LangGraph: Calculator) → Result
```

### Tier 2: Tools + Memory
```
POST /chat → API Gateway → Lambda (LangGraph: loadHistory → agent → saveHistory) → DynamoDB
                                              ↓
                                    Calculator / DuckDuckGo Search
```

### Tier 3: Multi-Agent Supervisor
```
POST /chat → API Gateway → Lambda (LangGraph)
                                              ↓
                    ┌─────────┬─────────┬─────────┐
                    ▼         ▼         ▼         ▼
               Supervisor Calculator Researcher Creator
                    ↓         ▼         ▼         ▼
               (routes)   (math)   (search)  (creative)
                    └─────────┴─────────┴─────────┘
                              ↓
                    ┌───────────────────┐
                    │   Human-in-Loop   │ (placeholder)
                    └───────────────────┘
                              ↓
                       Save History → DynamoDB
                              ↓
                       Artifacts → S3
```

---

## 🔐 Security Notes

- **No secrets in code** — All config via SAM parameters / environment variables
- **Least-privilege IAM** — Each tier's `template.yaml` grants only required permissions
- **No hardcoded ARNs/keys** — Resources created by SAM, referenced via `!Ref` / `!GetAtt`
- **DynamoDB TTL** — Tier 2/3 auto-expire conversations after 7 days
- **S3 bucket policies** — Tier 3 artifacts bucket is private, versioned, lifecycle-managed
- **Dependency versions pinned** — `package-lock.json` committed for reproducible builds

> **Before deploying to production:** Review IAM policies, enable CloudWatch logging, add WAF to API Gateway, consider custom domain + ACM cert.

---

## 💰 Cost Estimate (AWS Free Tier Eligible)

| Tier | Lambda | API Gateway | DynamoDB | S3 | Monthly (Free Tier) |
|------|--------|-------------|----------|-----|---------------------|
| 1 | 1M req / 400K GB-sec | 1M req | — | — | **$0** |
| 2 | 1M req / 400K GB-sec | 1M req | 25 GB storage | — | **$0** |
| 3 | 1M req / 400K GB-sec | 1M req | 25 GB storage | 5 GB storage | **$0** |

> At scale (>1M req/mo): ~$5-20/mo depending on usage. See each tier's README for details.

---

## 📚 Learning Path

```
Tier 1 → Tier 2 → Tier 3 → Production
  │       │       │         │
  ▼       ▼       ▼         ▼
StateGraph  Tools    Multi-   CDK/TypeScript
Single tool  + mem   agent    Step Functions
             DynamoDB          Bedrock
                                 Streaming
```

**After Tier 3, consider:**
- **CDK (TypeScript)** parity for teams that prefer IaC over SAM
- **AWS Bedrock** integration (Claude 3, Titan) instead of OpenAI
- **WebSocket API Gateway** for true streaming responses
- **Step Functions** for durable workflows >15 min
- **X-Ray tracing** + custom CloudWatch metrics

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Run tests (`npm test` in the relevant tier)
4. Submit a PR with a clear description

**Ideas for contributions:**
- Tier 4: Bedrock + Streaming + Step Functions
- Python (LangGraph + FastAPI + SAM) versions
- Terraform / Pulumi equivalents
- Additional tools (Python REPL, file ops, SQL)
- Integration test suites

---

## 📜 License

MIT — Use freely for personal, educational, or commercial projects.

> **These were commercial products.** I open-sourced them because they're more valuable as portfolio pieces and learning resources than as $29 Gumroad downloads. If they save you time, consider [sponsoring me](https://github.com/sponsors/rainawells) or checking out my [other work](https://github.com/rainawells).

---

## 🙋 Author

**Raina Wells** — Cloud Developer, AWS Community Builder
- GitHub: [@rainawells](https://github.com/rainawells)
- LinkedIn: [linkedin.com/in/rainawells](https://linkedin.com/in/rainawells)
- Portfolio: [rainawells.dev](https://rainawells.dev)

*Built to prove that enterprise-grade AI agents don't require enterprise budgets.*