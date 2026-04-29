# AWS Deployment Plan: Luxe AI Customer Support (Cost-Optimized Serverless)

This document outlines the strategy and step-by-step plan for deploying the Luxe AI Customer Support system to Amazon Web Services (AWS) using the **absolute cheapest, serverless architecture** possible, maximizing the AWS Free Tier.

## 1. Target AWS Architecture (Cost-Optimized)

To keep costs near $0/month for low traffic, we are bypassing expensive always-on components like Load Balancers (ALB) and container orchestration (ECS Fargate).

*   **Frontend (Next.js):** **AWS Amplify Hosting**. Fully managed SSR support with a generous free tier (1000 build minutes, 15GB bandwidth). Effectively $0/month.
*   **Backend (FastAPI + CrewAI):** **AWS Lambda via Function URLs**. We will wrap the FastAPI application using `Mangum` to run as a serverless function. Lambda provides 1 million free requests per month. Using a Function URL bypasses API Gateway costs entirely.
*   **Database (Replacing SQLite):** **Amazon RDS PostgreSQL (Free Tier)**. If the AWS account is under 12 months old, use the `db.t4g.micro` free tier. (Alternative for older accounts: A single `t4g.nano` EC2 instance for ~$3/month running Postgres).
*   **LLM Infrastructure:** **Amazon Bedrock**. Pay-per-token model with zero base server costs. We will prioritize **Anthropic Claude 3 Haiku** for all agents to ensure blazing fast speeds at the lowest possible token cost, and **Amazon Titan** for embeddings.
*   **Secrets Management:** **AWS Systems Manager Parameter Store** (Standard Tier is free, whereas Secrets Manager costs $0.40 per secret/month).

---

## 2. Step-by-Step Deployment Plan

### Phase 1: Serverless Backend Preparation
1.  **Install Mangum:** Add `mangum` to the backend `requirements.txt`.
2.  **Update FastAPI Entrypoint:** In the main FastAPI file (e.g., `main.py`), wrap the FastAPI app instance: `handler = Mangum(app)`. This allows AWS Lambda to route API Gateway/Function URL events to FastAPI.
3.  **Database Migration:** Update `backend/app/database.py` and `frontend/prisma/schema.prisma` to use PostgreSQL instead of SQLite (`dev.db`). Generate the necessary Prisma migrations.

### Phase 2: Database Provisioning
1.  **RDS Setup:** Provision an Amazon RDS PostgreSQL instance (select the "Free Tier" template if applicable). Ensure it is publicly accessible ONLY to your specific IP for initial setup, or keep it private and deploy Lambda in the same VPC.
2.  **Run Migrations:** Apply your Prisma database migrations to the new RDS instance.
3.  **Store Credentials:** Store the `DATABASE_URL` in AWS Systems Manager Parameter Store as a SecureString.

### Phase 3: Multi-LLM Setup with Amazon Bedrock
1.  **Model Access:** Request access to **Anthropic Claude 3 Haiku** and **Amazon Titan Embeddings V2** within the Amazon Bedrock console.
2.  **Backend Refactor:** Update the AgentFactory (`backend/app/agents/factory.py`) to use `langchain-aws` (Bedrock) instead of the local Ollama provider. Configure all agents to use the Haiku model to minimize costs.
3.  **IAM Permissions:** Ensure the Lambda execution role will have permissions to invoke Bedrock models (`bedrock:InvokeModel`).

### Phase 4: Backend Deployment (AWS Lambda)
1.  **Packaging:** Since the backend includes heavy ML libraries (like CrewAI/Langchain), package the backend application and its dependencies into a ZIP file. Note: If the unzipped size exceeds AWS Lambda's 250MB limit, we will deploy the Lambda function using a **Docker Container image** hosted on Amazon ECR (Lambda still charges per invocation, keeping it cheap).
2.  **Create Lambda Function:** Create the Lambda function in the AWS Console. Set the handler to `main.handler`.
3.  **Environment Variables:** Map environment variables from Parameter Store (Database URL, Clerk keys, etc.) to the Lambda function.
4.  **Enable Function URL:** In the Lambda configuration, enable a Function URL (Auth type: NONE, as your FastAPI app handles Clerk JWT authentication). This URL will serve as your backend API endpoint.

### Phase 5: Frontend Deployment (AWS Amplify)
1.  **Amplify Setup:** Connect your GitHub repository to AWS Amplify.
2.  **Environment Variables:** Configure the frontend environment variables in the Amplify console. Crucially, set `NEXT_PUBLIC_API_URL` to the Lambda Function URL generated in Phase 4.
3.  **Build & Deploy:** Amplify will automatically detect the Next.js app, install dependencies, build the SSR output, and deploy it globally.

### Phase 6: Monitoring (Day 2 Operations)
1.  **CloudWatch Logs:** Monitor backend errors and execution times via AWS CloudWatch automatically attached to your Lambda function.
2.  **Cost Explorer:** Set up an AWS Billing Alert for $5.00 to ensure no unexpected spikes in Lambda invocations or Bedrock token usage occur.
