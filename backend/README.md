# Luxe AI Support Backend

The brain of the Luxe support system. This FastAPI server hosts a team of autonomous AI agents that handle customer inquiries by searching products, managing orders, and querying company policies.

## 🧠 Optimized Agent Architecture

We use an optimized **CrewAI** pipeline designed for maximum speed and minimum token usage. The reasoning engine is powered by **Google Gemini 1.5 Flash**.

### 1. Fast Router (LiteLLM)
- **Mechanism**: A direct LLM call using LiteLLM (bypassing full Crew overhead) for instant intent classification.
- **Goal**: Instantly routes simple greetings to static responses and complex queries to the appropriate specialist tools.

### 2. Unified Luxe Specialist
- **Mechanism**: A single, powerful agent with access to all tools (`get_company_faq`, `search_products`, `order_management`, etc.).
- **Benefit**: Eliminates task-switching latency and agent handoff overhead.
- **Workflow**: Performs info gathering and tool execution in a single pass before handing the context to the final responder.

### 3. Customer Experience Specialist
- **Mechanism**: Final stage agent that synthesizes gathered data into a warm, on-brand response.

---

## 🔒 Security & GDPR Compliance

- **PrivacyScrubber**: Real-time **pseudonymization** of all user inputs. Names, emails, phone numbers, and physical addresses are replaced with tokens before being sent to any LLM.
- **Detokenization**: The system restores original data only at the final edge of the response.
- **Strict Authentication**: JWT signatures from Clerk are strictly verified to prevent forgery.
- **IDOR Protection**: Tools automatically filter database queries by the verified user's email, preventing cross-user data access.
- **Data Retention**: An automated startup task purges chat messages older than 30 days.
- **Encryption**: All database communication with AWS RDS is secured via **SSL**.

---

## 🛠 Tech Stack
- **FastAPI**: High-performance web framework.
- **CrewAI**: Multi-agent orchestration.
- **Gemini 1.5 Flash**: Primary LLM for orchestration and reasoning.
- **SQLAlchemy**: Secure access to AWS RDS PostgreSQL.
- **FAISS & HuggingFace**: Local vector store and embeddings for RAG.

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

2.  **Environment Variables**:
    Create a `.env` file with:
    ```env
    DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=verify-full&sslrootcert=ca-bundle.pem
    GOOGLE_API_KEY=your_gemini_api_key
    CLERK_PEM_PUBLIC_KEY=your_clerk_pem
    ```

### Running the Server
```bash
python run.py
```
The server runs on `http://localhost:3001`.

---

## 📂 Structure
- `/app/agents`: CrewAI agent definitions and factory.
- `/app/tasks`: Task generation factory.
- `/app/tools`: Custom tools for DB and FAQ access.
- `/app/services`: Business logic (Crew orchestration).
- `/app/core`: Configuration and security settings (SSL, PII scrubbing).
- `/faq_index`: Persistent FAISS vector storage.
