# Project Walkthrough: Hardened Agentic RAG Portal

This document summarizes the transition of your Customer Support Portal from a simple FAQ lookup into a production-grade, agentic AI platform.

## 🚀 Key Features Implemented

### 1. Multi-Agent Team (CrewAI)
The assistant is now powered by **CrewAI**, moving from a single bot to a team of specialists:
- **Policy Support Specialist**: An agent dedicated to searching the FAQ and company rules.
- **Order & Catalog Manager**: An agent dedicated to fetching live data from your SQL database.
- **Sequential Orchestration**: The agents collaborate to answer complex, multi-part questions (e.g., checking an order while explaining the refund policy).

### 2. AI Guardrails & Scope Enforcement
- **Domain Locking**: The AI is strictly limited to customer support. It will politely refuse to count numbers, write poems, or answer general trivia.
- **Privacy First**: Integrated with Clerk to personalize greetings (e.g., "Hello Ali!") while ensuring only sanitized data (First Name only) is shared with the LLM.

### 3. Software Engineering Best Practices
- **Environment Safety**: Centralized configuration in `.env.local` (API URLs, Clerk Keys).
- **Type Safety**: Full TypeScript coverage across the frontend and backend actions to prevent runtime crashes.
- **UI Resilience**: 
    - **Health Monitoring**: High-end visual feedback if the AI "brain" is offline.
    - **Draggable Widget**: A custom drag-and-drop system allowed you to move the AI icon anywhere on the screen with position memory.

### 4. Critical Bug Fixes
- **Checkout Stability**: Fixed the "Complete Checkout" button bug. It now correctly validates authentication and delivery address, with dynamic labels for a better user experience.
- **UI Overlap**: Resolved z-index conflicts to ensure the AI icon never blocks your shopping basket.

---

## 📁 Technical Architecture

- **Backend**: FastAPI + CrewAI (`crew_assistant.py`, `tools.py`)
- **Frontend**: Next.js + TailwindCSS + Clerk
- **Inference**: Local Ollama (Llama 3.1:8b for reasoning, Nomic-Embed for RAG)
- **Database**: SQLite (Transactional) + ChromaDB (Vector Knowledge)

## ✅ Verification Status
- [x] FAQ Retrieval
- [x] SQL Order Status Lookup
- [x] SQL Product Search
- [x] Out-of-scope Refusal (Guards)
- [x] Checkout Validation
- [x] Draggable UI & Persistence
- [x] Backend Health UI

---
*Created by Antigravity AI - Building for the Future.*
