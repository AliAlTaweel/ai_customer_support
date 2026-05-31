# Luxe Platform Evolution Roadmap

This roadmap evolves Luxe from a single-tenant AI customer support demo into a production-grade AI Platform — bridging the gap between "AI App Engineer" and "AI Platform Engineer" on a CV.

Each phase builds on the previous one. Do not skip ahead.

---

## Phase 1: Analytics Dashboard (Admin Panel)

**Priority:** 🔴 Start Here  
**Estimated Time:** 1–2 weeks  
**CV Impact:** Data Engineering, Business Intelligence, Internal Tooling  

### Why This Phase First
- Fastest to build — all the data already exists in RDS (1,303 ChatMessages, 109 PerformanceMetrics, 13 Complaints, 32 Orders).
- Immediately demoable — recruiters see live charts in 5 seconds.
- Required foundation for Phase 3 (every tenant will need their own dashboard).

### What To Build
A protected `/admin` route in the frontend showing real-time analytics pulled from the existing PostgreSQL database.

#### Dashboard Panels
1. **Conversation Volume**
   - Messages per day (bar chart, last 30 days)
   - User vs. assistant message ratio
   - Unique sessions per day

2. **AI Performance Metrics**
   - Average response time by pathway (FAST_TRACK vs SINGLE_AGENT vs MULTI_AGENT)
   - Latency trend over time (line chart)
   - Pathway distribution (pie chart: what % of queries hit each route)

3. **Topic & Intent Breakdown**
   - Most common query categories (from FAQ hits and keyword analysis)
   - Top 10 most asked questions
   - Unanswered/fallback queries (where the AI couldn't resolve)

4. **Complaint & Escalation Tracker**
   - Open complaints by priority (HIGH / MEDIUM / LOW)
   - Complaint resolution rate
   - Average time from complaint to resolution

5. **Business Metrics**
   - Total orders and revenue
   - Most popular products
   - Order status distribution (PENDING / SHIPPED / CANCELLED)

#### Technical Implementation
- **Backend:** New FastAPI `/api/admin/analytics` endpoints that run aggregate SQL queries against existing tables.
- **Frontend:** New `/admin` page in Next.js with a charting library (Recharts or Chart.js).
- **Auth:** Restrict access to admin users only (Clerk role-based check).

#### GDPR & Data Privacy Guardrails
The GDPR infrastructure is **already built** — Phase 1 wires it into the new analytics endpoints rather than building it from scratch:

| Guardrail | GDPR Article | Status | Implementation |
|:---|:---|:---|:---|
| **JWT Auth & RBAC** | Art. 32 (Security) | ✅ Exists | `app/core/auth.py` — `get_current_user()` dependency with full RS256/JWKS verification via Clerk. Wire into `analytics.py` with an `is_admin` check. |
| **PII Scrubbing** | Art. 5(1)(c) (Data Minimisation) | ✅ Exists | `app/core/privacy.py` — `PrivacyScrubber` class using Microsoft Presidio + spaCy. Call `scrub_dict()` / `pseudonymize_text()` on any text lists before returning to the dashboard. |
| **Aggregate-Only Payloads** | Art. 25 (Privacy by Design) | 🆕 Build in Phase 1 | Analytics endpoints return only `COUNT`, `AVG`, `SUM` query results — zero raw messages or customer details sent to the frontend. |
| **Storage Limitation** | Art. 5(1)(e) (Storage Limitation) | ✅ Exists | `app/tools/chat_history.py` — `purge_old_messages_fn()` runs on startup, enforcing `DATA_RETENTION_DAYS = 30` from config. |
| **Right to Erasure** | Art. 17 (Right to be Forgotten) | ✅ Exists | `app/tools/chat_history.py` — `delete_chat_history_fn(user_id)` hard-deletes all messages for a given user. Expose as a protected admin endpoint in Phase 1. |

---

## Phase 2: ML Intent Classifier

**Priority:** 🟡 Build After Phase 1  
**Estimated Time:** 1–2 weeks  
**CV Impact:** Machine Learning, MLOps, Model Training & Deployment  

### Why This Phase
- Adds a genuine ML component (trained model, not just API calls).
- Uses production data from Phase 1's analytics to generate training labels.
- Demonstrates the full ML lifecycle: data → training → evaluation → deployment → monitoring.

### What To Build
A lightweight scikit-learn model that classifies incoming user messages into intents before they reach Gemini.

#### Intent Categories
| Intent | Example Messages | Action |
|:---|:---|:---|
| `greeting` | "Hi", "Hello", "Hey there" | Instant response, skip Gemini |
| `faq` | "What is your return policy?" | Route directly to FAISS RAG |
| `product_search` | "I want to buy a laptop" | Route to product tools |
| `order_query` | "Where is my order?", "Track my order" | Route to order tools |
| `complaint` | "This is unacceptable", "I want a refund" | Flag as high priority + route to agent |
| `other` | Ambiguous or complex queries | Fall back to Gemini |

#### ML Pipeline
1. **Data Labeling**
   - Export 595 user messages from ChatMessage table.
   - Label 300+ messages with intent categories (can use Gemini to assist with bulk labeling, then manually verify).

2. **Model Training**
   - `TfidfVectorizer` → `LogisticRegression` (or `LinearSVC`).
   - Train/test split (80/20).
   - Evaluate: precision, recall, F1-score per intent.
   - Target: >85% accuracy on test set.

3. **Deployment**
   - Save model as `.pkl` files in `backend/models/`.
   - Load at FastAPI startup.
   - New middleware step: classify intent before heuristic router.
   - If confidence > 80%, use the prediction. Otherwise, fall through to Gemini.

4. **Monitoring (connect to Phase 1 Dashboard)**
   - Log every prediction (intent, confidence, actual outcome) to a new `IntentPrediction` table.
   - Add a "Model Performance" panel to the admin dashboard showing accuracy over time.
   - Alert when accuracy drops below 80% (model drift detection).

5. **Retraining Pipeline (Optional — adds Prefect/MLOps value)**
   - Weekly Prefect job that pulls new labeled data, retrains the model, evaluates against the previous version, and promotes it only if accuracy improves.

#### Output Files
```
backend/
├── models/
│   ├── intent_classifier.pkl
│   └── tfidf_vectorizer.pkl
├── ml/
│   ├── train_classifier.py
│   ├── label_data.py
│   └── evaluate_model.py
```

---

## Phase 3: Multi-Tenant Architecture

**Priority:** 🟢 Build Last  
**Estimated Time:** 3–5 weeks  
**CV Impact:** SaaS Architecture, Data Isolation, B2B Platform Engineering  

### Why This Phase Last
- Requires the most architectural changes (database, auth, API layer).
- Needs the dashboard (Phase 1) to already exist — each tenant gets their own.
- Needs the classifier (Phase 2) to already exist — each tenant can have their own model trained on their data.
- This is what transforms Luxe from a "project" into a "product."

### What To Build
Allow multiple businesses to sign up, each with their own isolated product catalog, FAQ knowledge base, conversation history, and admin dashboard.

#### Tenant Isolation Strategy

**Recommended: Row-Level Isolation (Single Database)**
- Add a `tenantId` column to every table (ChatMessage, Product, Order, FAQ, Complaint, PerformanceMetric).
- All API queries filter by `tenantId` automatically via middleware.
- Simplest to implement, sufficient for up to ~100 tenants.

**Alternative: Schema-Level Isolation (for stricter compliance)**
- Each tenant gets their own PostgreSQL schema within the same database.
- Better data isolation guarantees, but more complex migrations.

#### Key Components

1. **Tenant Management**
   - New `Tenant` table: `id`, `name`, `domain`, `plan`, `createdAt`.
   - New `TenantUser` table: maps Clerk users to tenants with roles (`owner`, `admin`, `agent`).
   - Onboarding flow: business signs up → creates tenant → uploads their products/FAQs.

2. **Data Isolation Middleware**
   - Every API request extracts `tenantId` from the authenticated user's JWT claims.
   - All database queries are automatically scoped to that tenant.
   - A tenant can never see another tenant's data.

3. **Per-Tenant Customization**
   - Each tenant uploads their own product catalog (CSV or admin UI).
   - Each tenant provides their own FAQ documents (for FAISS indexing).
   - Each tenant can customize the AI agent's persona/tone.
   - Each tenant gets their own FAISS vector index (namespaced by `tenantId`).

4. **Per-Tenant Dashboard**
   - The admin dashboard (Phase 1) filters all analytics by `tenantId`.
   - Each business owner sees only their own conversation data, complaints, and performance metrics.

5. **Embeddable Widget**
   - Generate a `<script>` tag per tenant that businesses embed on their website.
   - The widget opens an iframe pointing to `https://luxe.app/widget/{tenantId}`.
   - CORS validation ensures the widget only loads on the tenant's registered domain.

#### Database Migration Plan
```sql
-- Add tenantId to all existing tables
ALTER TABLE "ChatMessage" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);
ALTER TABLE "Product" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);
ALTER TABLE "Order" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);
ALTER TABLE "FAQ" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);
ALTER TABLE "Complaint" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);
ALTER TABLE "PerformanceMetric" ADD COLUMN "tenantId" UUID REFERENCES "Tenant"(id);

-- Backfill existing data to a "default" tenant
UPDATE "ChatMessage" SET "tenantId" = 'default-tenant-uuid';
-- ... repeat for all tables
```

---

## Summary: The Story This Tells

| After Phase | What Luxe Becomes | CV Narrative |
|:---|:---|:---|
| Phase 1 | AI App + Analytics Platform | "I built internal data tooling on top of production AI systems" |
| Phase 2 | AI App + Analytics + ML Pipeline | "I trained and deployed ML models using production data with automated retraining" |
| Phase 3 | Multi-Tenant AI SaaS Platform | "I architected a B2B SaaS platform with tenant isolation, per-tenant ML, and embeddable widgets" |

After all three phases, a single `docker-compose up` spins up an entire AI SaaS platform. That's not a project. That's a product.
