# 🗺️ Project Map & Context Dashboard

This file serves as a single, centralized map of the **Enterprise Autonomous AI Orchestration & Evaluation Pipeline** (Luxe Customer Support system). It allows AI models and developers to instantly orient themselves to the system architecture, file structure, security layers, and documentation resources without needing to read dozens of individual markdown files.

---

## 🏛️ System Architecture & Request Flow

The system splits queries into a high-speed heuristic bypass layer and a multi-tool agentic loop to optimize latency and minimize API costs.

```text
               ┌───────────────┐
               │     User      │
               └───────┬───────┘
                       │ Message
                       ▼
           ┌───────────────────────┐
           │   Next.js Frontend    │
           └───────────┬───────────┘
                       │ API Request (JWT Auth)
                       ▼
     ╔══════════════════════════════════════════════════════════════════╗
     ║                     FASTAPI BACKEND PIPELINE                     ║
     ║                                                                  ║
     ║  ┌───────────────────┐       ┌────────────────────────┐          ║
     ║  │ Telemetry Logger  │ ───►  │ Auth & CORS Validation │          ║
     ║  └───────────────────┘       └───────────┬────────────┘          ║
     ║                                          │                       ║
     ║                                          ▼                       ║
     ║                              ┌────────────────────────┐          ║
     ║                              │ GDPR Privacy Scrubber  │          ║
     ║                              └───────────┬────────────┘          ║
     ║                                          │                       ║
     ║                                          ▼                       ║
     ║                              ┌────────────────────────┐          ║
     ║                              │ Intent Routing Bypass  │          ║
     ║                              └─────┬────────────┬─────┘          ║
     ║                                    │            │                ║
     ║                         Fast Path  │            │  Complex Path  ║
     ║                         (<100ms)   │            │                ║
     ║                                    ▼            ▼                ║
     ║                        ┌──────────────┐     ┌──────────────┐     ║
     ║                        │  Fast-Track  │     │ Unified Luxe │     ║
     ║                        │   Service    │     │  AI Agent    │     ║
     ║                        └──────┬───────┘     └──────┬───────┘     ║
     ║                               │                    │             ║
     ║                               │                    │ Tool Calls  ║
     ║                               │                    ▼             ║
     ║                               │             ┌──────────────┐     ║
     ║                               │             │ Tool Bindings│     ║
     ║                               │             └────┬─────┬───┘     ║
     ║                               │                  │     │         ║
     ║                               │      Postgres    │     │ FAISS   ║
     ║                               │      Database    ▼     ▼ RAG     ║
     ║                               │              ┌──────┐┌──────┐    ║
     ║                               │              │ SQL  ││FAQ   │    ║
     ║                               │              │  DB  ││Index │    ║
     ║                               │              └──────┘└──────┘    ║
     ║                               ▼                    │             ║
     ║                          ┌──────────────┐          │             ║
     ║                          │   Response   │ ◄────────┘             ║
     ║                          └──────┬───────┘                        ║
     ║                                 │                                ║
     ║                                 ▼                                ║
     ║                        ┌──────────────────┐                      ║
     ║                        │ Response Cleaner │                      ║
     ║                        │  (Restore PII)   │                      ║
     ║                        └──────────────────┘                      ║
     ╚═════════════════════════════════┬════════════════════════════════╝
                                       │ Scrubbed Output
                                       ▼
                               ┌───────────────┐
                               │   Frontend    │
                               │  Chat Bubble  │
                               └───────────────┘
```

---

## 🛠️ Technological Stack

| Layer | Technologies Used | Key Implementation Details |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (React, TS), Tailwind CSS, Clerk (Auth) | Serves as the interactive widget and admin dashboard. |
| **Backend** | FastAPI, Uvicorn, Python 3.12, Pydantic v2 | High-concurrency async handling for the orchestration engine. |
| **AI Orchestrator** | Google AI SDK (Native Function Calling) | Configured with a `MANAGER_MODEL` and `WORKER_MODEL`. |
| **Security/Compliance** | Microsoft Presidio, Regex | In-flight PII pseudonymization and reverse-mapping. |
| **Database & ORM** | Supabase PostgreSQL (Prod), SQLite (Dev), Prisma, SQLAlchemy | Handles customer accounts, orders, products, and chat logs. |
| **RAG Vector Search** | FAISS, HuggingFace Sentence-Transformers | Local vector search against `/FAQ/faq.json`. |
| **MLOps & QA** | Custom Python Evaluation Suite | In `backend/evals/` to benchmark latency and routing regression. |
| **Infrastructure** | Docker, Nginx SSL Proxy (DuckDNS), AWS (EC2/Amplify/RDS) | Production hosting and domain-guarded CORS. |

---

## 📂 Codebase Directory & Key Files

### 1. Root Level Configuration
* [README.md](README.md) - System overview, automated regression stats, and deployment introduction.
* [system_uml.md](system_uml.md) - Contains extensive Mermaid diagrams for the routing and scrubbing pipelines.
* [docker-compose.yml](docker-compose.yml) - Configuration for running the local services in containerized setups.

### 2. Backend Service (`/backend/`)
* [run.py](backend/run.py) - Backend server runner. Starts Uvicorn with loop configurations.
* [requirements.txt](backend/requirements.txt) - Python dependencies (Google generativeai, fastapi, presidio-analyzer, etc.).
* **`/backend/app/` (Core Application)**:
  * [main.py](backend/app/main.py) - Main FastAPI instance. Sets up CORS, exception handlers, and API router.
  * [core/config.py](backend/app/core/config.py) - Configuration settings, environment variables, default SQLite paths, and models.
  * [core/privacy.py](backend/app/core/privacy.py) - GDPR-compliant `PrivacyScrubber` using Presidio-Analyzer & regular expressions.
  * **`services/` (Business Logic Execution)**:
    * [fast_track_service.py](backend/app/services/fast_track_service.py) - Instant matcher/regex rules bypass layer (greetings, simple queries, and widgets).
    * [native_agent_service.py](backend/app/services/native_agent_service.py) - Google GenAI Agent with dynamic function calling schema binding.
    * [response_cleaner.py](backend/app/services/response_cleaner.py) - Swaps PII tokens back to their original values post-generation.
    * [telemetry_service.py](backend/app/services/telemetry_service.py) - Observability tracker (structured JSON output of costs, tokens, and signals).
  * **`tools/` (Agent Function Tools)**:
    * [faq_tools.py](backend/app/tools/faq_tools.py) - RAG FAQs search querying local FAISS indices.
    * [order_tools.py](backend/app/tools/order_tools.py) - Database actions for order inspection, cancellations, and creation.
    * [product_tools.py](backend/app/tools/product_tools.py) - Catalog searching functions.
    * [chat_history.py](backend/app/tools/chat_history.py) - In-memory and SQLite-backed thread history.
* **`/backend/evals/` (MLOps Suite)**:
  * [eval_agent.py](backend/evals/eval_agent.py) - Core test runner validating scrubbing, latency, routing accuracy, and hallucination bounds.

### 3. Frontend App (`/frontend/`)
* [package.json](frontend/package.json) - Next.js dependencies, scripts, Shadcn UI setup.
* [next.config.ts](frontend/next.config.ts) - Node.js proxy overrides and route configuration.
* **`prisma/` (Data Platform Schema)**:
  * [schema.prisma](frontend/prisma/schema.prisma) - Prisma models mapping out `User`, `Order`, `Product`, and `Complaint`.
  * [seed.ts](frontend/prisma/seed.ts) - Database populator utility.

---

## 🛡️ Security, Privacy & Compliance Controls

1. **In-Flight Pseudonymization**: 
   All prompts are filtered inside the backend. PII (e.g. Names, Emails, Shipping Addresses) is replaced with secure tokens (e.g., `[USER_NAME_1]`, `[EMAIL_1]`) before being sent to Google Gemini APIs. Response payload reversibility is performed at the cleanup stage (`ResponseCleaner`).
2. **Anti-IDOR SQL Filters**:
   Write/Read tools targeting order tables require dynamic auth checks. SQL queries explicitly enforce strict validation checks:
   `WHERE customerEmail = :auth_email`
   This prevents users from looking up or canceling orders belonging to other customers by simply guessing integers.
3. **Write Confirmation Rules**:
   State-changing modifications (like canceling an order or updating a shipping address) trigger a mandatory `"CONFIRMATION_REQUIRED"` signal from tools. The agent must collect user confirmation explicitly before executing writes.

---

## 📈 Key Documentations & Roadmaps

The repository houses detailed architectural papers and roadmaps across several subfolders:
* **Private Notes**: [private_notes/all.md](private_notes/all.md) is the compiled index summarizing the following docs:
  * System Architecture Deep-Dive: [system_architecture.md](private_notes/system_architecture.md)
  * Technological & Library Blueprint: [backend_map.md](private_notes/backend_map.md)
  * Nginx & SSL setup: [docs/backend_ssl_nginx_setup_guide.md](private_notes/docs/backend_ssl_nginx_setup_guide.md)
  * Cloud Serverless Deployment (AWS Lambda): [docs/aws.md](private_notes/docs/aws.md)
  * Solvency Extraction Plan (gazette parsing): [valuatum_architecture_plan.md](private_notes/valuatum_architecture_plan.md)
  * Outbound networking pitches: [outbound_outreach_templates.md](private_notes/outbound_outreach_templates.md)
* **Future Evolutions**:
  * Platform Roadmap: [platform_evolution_roadmap.md](future_plans/platform_evolution_roadmap.md)
  * Ticketing System: [ticketing_roadmap.md](future_plans/ticketing_roadmap.md)
  * Upgrades to Mid-Level: [mid_level_upgrade_plan.md](future_plans/mid_level_upgrade_plan.md)

---

## 🚀 Running commands Cheat-sheet

### Local Development Start
1. **Start Backend Server**:
   ```bash
   cd backend
   source venv_v3/bin/activate
   python run.py
   ```
2. **Start Frontend Client**:
   ```bash
   cd frontend
   npm run dev
   ```

### MLOps Evaluation & Synchronization
* **Run Regression Tests**:
  ```bash
  cd backend
  ./venv_v3/bin/python evals/eval_agent.py
  ```
* **Rebuild FAISS Vector Index**:
  ```bash
  cd backend
  ./venv_v3/bin/python sync_faq.py
  ```
