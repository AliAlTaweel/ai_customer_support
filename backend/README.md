# Luxe AI Support Backend

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/CrewAI-Orchestration-orange?style=for-the-badge" alt="CrewAI" />
  <img src="https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/SQLAlchemy-Secure%20ORM-D12325?style=for-the-badge" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

The brain of the Luxe support system. This FastAPI server hosts a team of autonomous AI agents and fast-track handlers that handle customer inquiries by searching products, managing orders, tracking shipments, and querying company policies.

---

## 🧠 Optimized Agent & Handler Architecture

We use an optimized hybrid pipeline combining **Fast-Track Handlers** and a **CrewAI** pipeline designed for maximum speed, security, and minimal token usage. The reasoning engine is powered by **Google Gemini 1.5 Flash**.

### 1. Fast-Track Pipeline (Bypass CrewAI Latency)
The `FastTrackService` handles highly structured user intents instantly without invoking any LLMs, yielding sub-100ms response times:
- **Order Cancellation**: Validates and cancels orders with full security checks and immediate DB state updates.
- **Support & Complaints**: Allows direct, structured complaint submission to the administration team.
- **RAG FAQ Retrieval**: Employs local HuggingFace embeddings and FAISS vector indices to retrieve answers to company policy questions immediately.
- **Greetings & Clarifications**: Handles standard welcome messages and follow-up prompts.

### 2. Active Order Tracking & Shipment Injection
- **MockTrackingService**: For any order status inquiry (via order ID, email, or "last order"), the backend fetches order data and generates real-time UPS tracking simulations.
- **State-Aware Milestones**: Computes real-time progress, carrier details, estimated delivery dates, current coordinates, and custom milestones depending on whether the order status is `PENDING`, `PROCESSING`, `SHIPPED`, or `DELIVERED`.
- **Frontend Map Payload**: Injects a structured `TRACKING_INFO: { ... }` payload in the response, allowing the frontend chat widget to render real-time progress bars and maps.

### 3. Fast Router (LiteLLM)
- **Mechanism**: A direct, low-latency LLM call using LiteLLM to classify intent for complex/unstructured requests.
- **Goal**: Instantly routes simple queries to static responses, and complex transactional queries to the appropriate specialist tools.

### 4. Unified Luxe Specialist (CrewAI)
- **Mechanism**: A single, powerful agent with access to all tools (`get_company_faq`, `search_products`, `order_management`, etc.).
- **Benefit**: Eliminates task-switching latency and agent handoff overhead.
- **Workflow**: Performs info gathering and tool execution in a single pass. Now uses **robust regex-based signal extraction** to reliably communicate with the frontend (e.g., `CHECKOUT_REQUIRED`, `PLACE_ORDER_SUMMARY`).

### 5. Customer Experience Specialist (CrewAI)
- **Mechanism**: Final stage agent that synthesizes gathered data into a warm, on-brand response.

---

## 🔒 Security & GDPR Compliance

- **PrivacyScrubber**: Real-time **pseudonymization** of all user inputs. Names, emails, phone numbers, and physical addresses are replaced with secure tokens before being sent to any LLM.
- **Detokenization**: The system restores original data only at the final edge of the response.
- **Strict Authentication**: JWT signatures from Clerk are verified. Strict issuer verification is bypassed where necessary to support custom Clerk proxy domains on AWS Amplify deployments.
- **IDOR Protection**: Tools automatically filter database queries by the verified user's email, preventing cross-user data access.
- **Data Retention**: An automated startup task purges chat messages older than 30 days.
- **Encryption**: All database communication with AWS RDS is secured via **SSL**.

---

## 🚦 Getting Started

### Installation

1. **Environment**:
   ```bash
   cd backend
   python -m venv venv_v3
   source venv_v3/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
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

Alternatively, use Docker for production:
```bash
docker build -t luxe-backend .
# Run with env vars
docker run -p 3001:3001 --env-file .env luxe-backend
```
For a full production setup (including Postgres) on AWS EC2, refer to the [Deployment Guide](file:///Users/alial-taweel/.gemini/antigravity/brain/de1f030b-9e87-4dfc-8410-11bf630548e7/deployment_guide.md).

---

## 📂 Structure

- `/app/agents`: CrewAI agent definitions and factory.
- `/app/tasks`: Task generation factory.
- `/app/tools`: Modularized tools for DB and FAQ access.
    - `base.py`: Shared database session management.
    - `product_tools.py`: Product search and catalog tools.
    - `order_tools.py`: Order placement and management.
    - `support_tools.py`: Company FAQ and policy retrieval.
- `/app/services`: Business logic (Crew orchestration, fast-track routing, tracking simulation, and signal parsing).
- `/app/core`: Configuration and security settings (SSL, PII scrubbing, JWT decoding).
- `/faq_index`: Persistent FAISS vector storage.
