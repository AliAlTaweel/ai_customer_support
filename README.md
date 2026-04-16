# 🛡️ Hardened Agentic RAG Support Portal

A production-grade, local-first artificial intelligence customer support portal. This system utilizes a **multi-agent orchestration layer (CrewAI)** combined with a **hardened RAG (Retrieval-Augmented Generation)** pipeline to provide intelligent, secure, and data-driven responses—all running entirely on local hardware.

---

## 📂 Project Structure & File Guide

### 🧠 Intelligence & Logic
- **`.skills/`**: Contains the technical "brain" of the project.
  - `arch_agentic_rag.md`: High-level architecture and system flow.
  - `agent_logic.md`: Definition of agent roles, goal setting, and personas.
  - `guardrails.md`: Security logic for scope enforcement and PII protection.
  - `rag_indexing.md`: Technical documentation for the indexing and retrieval pipeline.

### ⚙️ Backend (AI Orchestration)
- **`backend/`**: The FastAPI-powered intelligence core.
  - `crew_assistant.py`: The **CrewAI Manager**. Defines the multi-agent team (Support Expert & Data Manager) and coordinates their collaboration.
  - `assistant.py`: The bridge class that connects the API endpoints to the CrewAI execution layer.
  - `router.py`: A specialized LLM router that classifies user intent into `FAQ`, `ACTION`, or `OUT_OF_SCOPE`.
  - `indexer.py`: Handles the data ingestion from `FAQ/faq.json` into the ChromaDB vector store.
  - `tools.py`: A suite of SQLite-compliant tools that allow the agents to fetch real-time data from the store.
  - `main.py`: The FastAPI server entry point.

### 📁 Data & Content
- **`db/`**: Persistent storage.
  - `mvp.db`: The transactional SQLite database (orders, customers, products).
  - `vector_store/`: The ChromaDB local directory containing the vectorized knowledge base.
- **`FAQ/`**: Source material for the support knowledge base.
  - `faq.json`: The raw JSON source of truths for policies and common questions.

### 🎨 Frontend (User Experience)
- **`frontend/`**: A modern Next.js 16 (Turbopack) web application.
  - `/src/app/indexing/`: A dedicated admin route for monitoring and triggering RAG index rebuilds.
  - `ChatWidget.tsx`: A custom, draggable AI assistant component with position persistence and Clerk authentication integration.
  - `CartSheet.tsx`: The shopping cart with hardened checkout logic.

---

## 🧠 How It Works

### 1. Intent Routing (The Filter)
Every query is first sent to the **Intent Router**. 
- If the query is off-topic (e.g., "Tell me a joke"), the **Guardrails** trigger an immediate professional refusal.
- If it's a legitimate support request, it moves to the CrewAI layer.

### 2. Multi-Agent Collaboration (The Brain)
The system invokes a **Crew** of two specialized agents:
1. **Policy Support Specialist**: Uses the RAG tool to search `faq.json` for rules and shipping info.
2. **Order & Catalog Manager**: Uses SQL tools to look up real order status or product prices.

If you ask: *"Where is my order 3 and what is your return policy?"*, the agents collaborate—Manager fetches order data, while Specialist fetches the policy—and they synthesize a unified, friendly response.

### 3. Local-First RAG (The Memory)
The system uses **Ollama** (`nomic-embed-text`) to turn your `faq.json` into search vectors stored in **ChromaDB**. This ensures your data never leaves your machine.

---

## 🛠️ Getting Started

### Prerequisites
- **Ollama**: Install [Ollama](https://ollama.com/) and run:
  ```bash
  ollama run llama3.1
  ollama pull nomic-embed-text
  ```
- **Node.js**: v18+
- **Python**: v3.12+

### Setup
1. **Environment**: Create a `frontend/.env.local` with your Clerk keys.
2. **Dependencies**:
   ```bash
   cd frontend && npm install
   cd ../backend && pip install -r requirements.txt # (using venv_customer)
   ```
3. **Database**: The `mvp.db` and `vector_store` are included in the repo for immediate use.

### Execution
Run the backend:
```bash
cd backend && python main.py
```
Run the frontend:
```bash
cd frontend && npm run dev
```

---
*Built with ❤️ by Antigravity AI - Pushing the boundaries of local agentic development.*
