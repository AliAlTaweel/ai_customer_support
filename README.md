# Luxe E-Commerce & AI Customer Support Assistant

A premium, modern e-commerce platform integrated with an advanced, multi-agent AI customer support system. This project demonstrates a production-grade architecture combining a **Next.js** frontend with a **FastAPI + CrewAI** backend.

## 🌟 Project Overview

This application provides a seamless luxury shopping experience where users can browse products, manage orders, and get intelligent support from an AI agent team that actually *acts* on the database (placing orders, canceling them, searching products) and provides factual answers from a company knowledge base.

### 🏗 Architecture

The project is split into two specialized components:

```mermaid
graph TD
    User((User)) --> Frontend[Next.js Frontend]
    Frontend --> DB[(SQLite DB)]
    Frontend -- "API Request" --> Backend[FastAPI Backend]
    
    subgraph "AI Agent Team (CrewAI)"
        Backend --> FastTrack[Fast-Track Interceptor]
        FastTrack -- "Trivial Request" --> Frontend
        FastTrack -- "Complex Request" --> Router[Intent Router]
        Router --> Specialist{Specialists}
        Specialist --> RAG[Knowledge Specialist]
        Specialist --> Ops[Order Ops Specialist]
        RAG --> FAQ[(FAQ JSON)]
        Ops --> DB
        Specialist --> CX[CX Specialist]
    end
    
    CX -- "Final Response" --> Frontend
```

- **Frontend (`/frontend`)**: A high-end web app built with Next.js, React, and Prisma.
- **Backend (`/backend`)**: An agentic AI server powered by CrewAI and FastAPI, using local LLMs (via Ollama) for privacy and speed. It features a fast-track interceptor to optimize token usage and latency for simple inputs.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (3.12+)
- **Ollama** (Running locally with `llama3.1:8b` and `gemma4:e4b`)

### 2. Database & Frontend Setup
```bash
cd frontend
npm install
npx prisma generate
npm run dev
```
The frontend will be available at [http://localhost:3000](http://localhost:3000).

### 3. AI Backend Setup
```bash
cd backend
source venv_v3/bin/activate  # On Windows: venv_v3\Scripts\activate
pip install -r requirements.txt
python run.py
```
The backend will run on [http://localhost:3001](http://localhost:3001).

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, CrewAI, LangChain |
| **LLMs** | Ollama (Llama 3.1 & Gemma 2) |
| **Database** | SQLite, Prisma (Frontend), SQLAlchemy (Backend) |
| **Search** | FAISS, HuggingFace Embeddings (RAG) |

---

*For detailed technical documentation, please refer to the README files in the respective `/frontend` and `/backend` directories.*
