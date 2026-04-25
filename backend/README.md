# Luxe AI Support Backend

The brain of the Luxe support system. This FastAPI server hosts a team of autonomous AI agents that handle customer inquiries by searching products, managing orders, and querying company policies.

## 🧠 AI Agent Architecture

We use **CrewAI** to orchestrate a team of specialized agents, each with a focused role and specific tools.

### 1. Intent Router
- **Role**: Categorizes the user message (Greeting, Order, Knowledge, or Complex).
- **Goal**: Optimize flow by routing directly to the right specialist.

### 2. Knowledge Specialist (RAG)
- **Role**: Expert on company policies.
- **Tools**: `get_company_faq` (Queries FAISS index of `FAQ/faq.json`).
- **Constraint**: Returns ONLY factual text from the FAQ; never invents policies.

### 3. Order Operations Specialist
- **Role**: Transactional expert.
- **Tools**: `search_products`, `get_order_details`, `cancel_order`, `place_order`.
- **Constraint**: Acts directly on the shared SQLite database.

### 4. Customer Experience Specialist
- **Role**: The final "voice" of the brand.
- **Goal**: Synthesizes information from specialists into a polished, premium response.

---

## 🛠 Tech Stack
- **FastAPI**: High-performance web framework.
- **CrewAI**: Multi-agent orchestration.
- **Ollama**: Local LLM runner (Default: `llama3.1:8b` for manager, `gemma4:e4b` for workers).
- **SQLAlchemy**: Database access to the frontend's SQLite file.
- **FAISS**: Local vector store for RAG.

---

## 🚦 Getting Started

### Installation
1.  **Environment**:
    ```bash
    cd backend
    python -m venv venv_v3
    source venv_v3/bin/activate
    pip install -r requirements.txt
    ```

2.  **Ollama Models**:
    Ensure Ollama is running and pull the models:
    ```bash
    ollama pull llama3.1:8b
    ollama pull gemma4:e4b
    ollama pull nomic-embed-text
    ```

### Running the Server
```bash
python run.py
```
The server runs on `http://localhost:3001`.

---

## 📂 Structure
- `/app/agents`: CrewAI agent and task definitions.
- `/app/tools`: Custom tools for DB and FAQ access.
- `/app/services`: Business logic (Crew orchestration).
- `/app/core`: Configuration and security settings.
- `/faq_index`: Persistent FAISS vector storage.
