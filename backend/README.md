# Luxe AI Support Backend

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Google%20Gemini-Native%20Agent-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Pydantic-Structured%20Outputs-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic" />
  <img src="https://img.shields.io/badge/SQLAlchemy-Secure%20ORM-D12325?style=for-the-badge" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

The brain of the Luxe support system. This FastAPI server hosts an optimized native Gemini AI agent and fast-track handlers that manage customer inquiries by searching products, managing orders, tracking shipments, and querying company policies.

---

## 🧠 Optimized Agent & Handler Architecture

We use an optimized hybrid pipeline combining **Fast-Track Handlers** and a **Native Gemini Tool-Calling Loop** designed for maximum speed, security, and minimal token usage. The reasoning engine is powered directly by a dynamically configured **Google Gemini model** (e.g., Gemini 1.5 Flash) using Pydantic structured schemas.

### 1. Fast-Track Pipeline & Semantic Router
The `FastTrackService` coordinates a hybrid **Semantic Intent Router** utilizing `gemini-embedding-2` and cosine similarity alongside quick-reply heuristics to bypass LLM latency entirely for structured requests:
- **Semantic Intent Classification**: Intercepts queries (greetings, order cancellations, status checks, FAQs) and routes them in sub-100ms, utilizing a single batched startup request to preload vector embeddings.
- **Onboarding Integration**: Pairs with frontend quick reply cards to handle actions like *Track Order*, *Browse Products*, and *Cancel Order* instantly.
- **Order Cancellation**: Validates and cancels orders with full security checks and SQLAlchemy ORM database state updates.
- **Support & Complaints**: Allows direct, structured complaint submission to the administration team.
- **RAG FAQ Retrieval**: Queries pgvector embeddings dynamically or falls back to FAISS vector indices to retrieve answers instantly.

### 2. Active Order Tracking & Shipment Injection
- **MockTrackingService**: For any order status inquiry (via order ID, email, or "last order"), the backend fetches order data and generates real-time UPS tracking simulations.
- **State-Aware Milestones**: Computes real-time progress, carrier details, estimated delivery dates, current coordinates, and custom milestones depending on whether the order status is `PENDING`, `PROCESSING`, `SHIPPED`, or `DELIVERED`.
- **Frontend Map Payload**: Injects a structured `TRACKING_INFO: { ... }` payload in the response, allowing the frontend chat widget to render real-time, persistent progress bars and interactive maps inside individual chat bubbles.

### 3. Unified Luxe Specialist (Native Gemini Agent)
- **Mechanism**: A single, high-performance agent with direct access to local python tools (`get_company_faq`, `search_products`, `order_management`, etc.).
- **Benefit**: Eliminates the heavy latency, prompt wrappers, and task-switching overhead of legacy agent frameworks (e.g., CrewAI).
- **Deterministic Output**: Guarantees output formats using Pydantic validation schemas (`ChatResponseSchema`), forcing the model to cleanly return a synthesized user message, UI signals (like `PLACE_ORDER_SUMMARY`), and custom payloads in a single pass with robust function call parsing.

### 4. Ticketing & Customer Complaint Search Tools
- **submit_complaint**: Creates a database record in Postgres with auto-tagging, priority classification, and chatSessionId binding.
- **get_user_complaints**: Retrieves all ticket summaries linked to a specific email address.
- **get_complaint_status**: Fetches detailed status and agent internal notes for a specific ticket ID.

---

## 🔄 Request Processing Lifecycle

All incoming messages pass through a streamlined **Hybrid Pipeline** to ensure minimum latency, maximum privacy, and accurate processing:

```mermaid
graph TD
    User([Customer Message]) --> API[FastAPI chat Endpoint]
    API --> RateLimit{Rate Limiter}
    RateLimit -- "Exceeded" --> Err429[429 Too Many Requests]
    RateLimit -- "Allowed" --> Agent[NativeAgentService]
    
    subgraph "Optimized Pipeline"
        Agent --> FastTrack{Phase 1: Fast-Track Bypass?}
        FastTrack -- "Match Found" --> FastResp[Process Instantly & Return <100ms]
        
        FastTrack -- "Complex" --> Scrub[Phase 2: Privacy Pseudonymization]
        Scrub --> NativeGemini[Phase 3: Native Gemini Agent & Tool Loop]
        NativeGemini --> StructuredOut[Phase 4: JSON Structured Response]
        StructuredOut --> Clean[Phase 5: Response Detokenization & Cleaning]
    end
    
    FastResp --> Return[Return ChatResponse]
    Clean --> Return
```

### 5-Phase Pipeline Phases
1. **Phase 1: Fast-Track Bypass**: The `FastTrackService` intercepts structured actions (greetings, confirmations, complaints) and resolves them instantly without LLM execution.
2. **Phase 2: Privacy Pseudonymization**: The `PrivacyScrubber` sanitizes the message, stripping out PII (names, emails, phone numbers, addresses) and converting them into stateless, cryptographically secure **Symmetric-Encryption (`Fernet`)** tokens: `[ENC_<TYPE>:<CIPHERTEXT>]`.
3. **Phase 3: Semantic Router & Native Agent Loop**: Executes a cosine-similarity check on query embeddings to determine the user's intent, then routes complex cases to the native Gemini Agent loop.
4. **Phase 4: JSON Structured Output**: Enforces structured schemas via Pydantic on the final Gemini call, cleanly separating `message`, `ui_signals`, and `payload`.
5. **Phase 5: Detokenization & Cleaning**: Restores original PII statelessly by decrypting tokens before sending the response back to the client.

---

## 🔒 Security & GDPR Compliance

- **PrivacyScrubber**: Real-time **stateless symmetric encryption** of all user inputs using a secure 32-byte key. Sensitive information is embedded within the token itself (`[ENC_<TYPE>:<CIPHERTEXT>]`), enabling horizontal scaling without shared session caches.
- **Detokenization**: Restores original PII statelessly by decrypting tokens on response cleanup, ensuring zero cleartext leakage to external APIs.
- **Strict Authentication**: JWT signatures from Clerk are verified using dynamically fetched JWKS (`CLERK_JWKS_URL`).
- **IDOR Protection**: Tools automatically filter database queries by the verified user's email, preventing cross-user data access.
- **Data Retention**: An automated startup task purges chat messages older than 30 days.
- **Database Encryption**: All database communication with Supabase is secured via **SSL**.
- **Transport Security (HTTPS)**: Backend traffic is fully encrypted using an **Nginx Reverse Proxy** on EC2 with a free SSL/TLS certificate via **Let's Encrypt (Certbot)**.

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
   # App & Server
   PORT=3001
   ALLOWED_ORIGINS=["http://localhost:3000"]

   # AI Models
   WORKER_MODEL=gemini/gemini-1.5-flash
   GOOGLE_API_KEY=your_gemini_api_key

   # Auth & DB
   CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
   CLERK_ISSUER=https://your-app.clerk.accounts.dev
   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres

   # Supabase Storage / S3 Vector Storage
   FAISS_S3_BUCKET=your-bucket-name
   AWS_REGION=eu-central-1
   AWS_S3_ENDPOINT_URL=https://[PROJECT_REF].storage.supabase.co/storage/v1/s3
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

---

## 📂 Structure

- `/app/schemas`: Defines validation schemas like `ChatResponseSchema` for structured output.
- `/app/models`: SQLAlchemy Declarative ORM model definitions (`database.py`) mapping the Supabase schema.
- `/app/tools`: Pure, high-performance tools for DB and FAQ access.
    - `base.py`: Database engine instantiation.
    - `product_tools.py`: Product search and catalog tools.
    - `order_tools.py`: Refactored SQLAlchemy ORM-driven order placement and cancellation.
    - `support_tools.py`: Classifies complaints, parses keyword tags, and provides email/ID status lookups.
- `/app/services`: Business logic (Native Gemini agent, Semantic Router, tracking simulation).
- `/app/core`: Configuration and security settings (stateless Fernet encryption, Presidio analyzer).
- `/faq_index`: Persistent FAISS vector storage.
