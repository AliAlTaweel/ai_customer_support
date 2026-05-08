# AWS Docker Deployment Guide

This document details the Docker configuration and the steps required to deploy the AI Customer Support Backend to AWS.

## 1. Docker Configuration

### Dockerfile
The application is containerized using the `Dockerfile` located in the `backend/` directory. 
- **Base Image:** `python:3.11-slim` (chosen for a lightweight footprint).
- **System Dependencies:** Installs `gcc` to support compiling any required C extensions for Python packages.
- **Dependency Management:** Copies `requirements.txt` and installs packages via `pip`.
- **Exposed Port:** Exposes port `8000`.
- **Execution Command:** Runs the Uvicorn ASGI server with the command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### .dockerignore
The `.dockerignore` file prevents unnecessary local files from being copied into the container. This keeps the image size small and secures sensitive data.
- **Excluded Files:** `venv_v3/`, `__pycache__`, `.env`, local `.db` files (like `luxe_support.db`), and log files.
- **Important:** Since `.env` is ignored, all environment variables must be provided directly to the container at runtime via the AWS service configuration.

## 2. Requirements & Prerequisites

Before deploying to AWS, ensure you have the following prerequisites met:
1. **AWS CLI:** Installed and configured on your local machine (`aws configure` with an IAM user that has ECR and ECS/App Runner permissions).
2. **Docker:** Installed and running locally to build the initial image.
3. **AWS Account:** Active account with billing enabled.

## 3. Deployment Steps

### Step A: Build the Image Locally
Navigate to the `backend/` directory and build the Docker image:
```bash
cd backend
docker build -t ai-customer-support-backend .
```

### Step B: Push to Amazon Elastic Container Registry (ECR)
Amazon ECR is where AWS stores Docker images.
1. **Create an ECR Repository:**
   Go to the AWS Console -> ECR -> "Create repository". Name it `ai-customer-support-backend`.
2. **Authenticate Docker to your ECR registry:**
   ```bash
   aws ecr get-login-password --region <YOUR_REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_REGION>.amazonaws.com
   ```
3. **Tag your local image:**
   ```bash
   docker tag ai-customer-support-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_REGION>.amazonaws.com/ai-customer-support-backend:latest
   ```
4. **Push the image:**
   ```bash
   docker push <AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_REGION>.amazonaws.com/ai-customer-support-backend:latest
   ```

### Step C: Deploy to an AWS Service

You have two main serverless options for running Docker containers on AWS:

#### Option 1: AWS App Runner (Recommended for Simplicity)
AWS App Runner is the easiest way to deploy a web application container.
1. Go to **AWS App Runner** in the console.
2. Click **Create an App Runner service**.
3. Select **Container registry** -> **Amazon ECR**.
4. Choose the repository and the image tag you just pushed.
5. In the service configuration:
   - **Port:** Set to `8000`.
   - **Environment Variables:** Add all variables from your `.env` file (e.g., API keys, database URLs).
6. Click **Create and deploy**.

#### Option 2: AWS ECS with Fargate (Recommended for Fine-Grained Control)
Use this if you need more control over networking, scaling rules, or VPC configurations.
1. **Create an ECS Cluster:** In the ECS console, create a Fargate cluster.
2. **Create a Task Definition:**
   - Launch type: **Fargate**.
   - Select your ECR image URL.
   - Add Port mapping for `8000`.
   - Inject environment variables under the container environment configuration.
3. **Run a Service:** Create a new Service in your cluster, select your Task Definition, and configure an Application Load Balancer to route traffic to port `8000`.

## 4. Persistent Storage (Database)
Currently, the backend uses a local SQLite database (`luxe_support.db`). 
- **Containers are ephemeral:** Any changes made to the local SQLite database inside the container will be lost when the container stops or restarts.
- **Production Solution:** For AWS deployment, you must migrate from a local SQLite database to an AWS-hosted database like **Amazon RDS (PostgreSQL/MySQL)**. Update the connection string in your AWS container's environment variables to point to the RDS instance.
