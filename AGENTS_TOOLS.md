# Building the Hybrid Agentic Support System

This guide explains how to implement the **Search-Verify-Act** architecture, which combines high-speed RAG with sophisticated multi-agent reasoning.

## 1. Foundation: The Knowledge Base (RAG)
Before the agents can work, you need a vector store for company policies.
*   **Storage:** Use ChromaDB (local) or a vector service.
*   **Embeddings:** Use a local model like `nomic-embed-text` via Ollama for privacy and speed.
*   **Indexing:** Create an `indexer.py` that reads `faq.json`, chunks the text, and saves it to a persistent directory.

## 2. Tier 1: The Hybrid Gatekeeper
The Gatekeeper is the application's entry point. Its job is to decide: "Can I answer this cheaply/quickly, or do I need the 'Smart' agents?"

### Implementation Steps:
1.  **Intent Heuristics:** Use string matching (regex) to catch keywords like "status", "order #", or "cancel". If found, skip the Fast Path and escalate immediately.
2.  **Fast RAG:** Perform a quick vector search.
3.  **Verification (The Evaluator):** Use a low-temperature LLM call to ask: *"Based on this context, is there a 100% complete answer to the user query? Respond YES/NO."*
4.  **Short-Circuit:** If YES, return the RAG answer. This saves ~15-20 seconds of agent thinking time.

## 3. Tier 2: The Support Crew (CrewAI)
If the Gatekeeper fails or sees a data-heavy request, it triggers the **Support Crew**.

### Agent Roles:
*   **Policy Support Specialist:** Focuses on FAQ tools. It ensures the tone is professional and policies are followed.
*   **Data Investigator:** Only has **Read-Only** SQL tools. It queries `orders`, `customers`, and `products`.
*   **Order Operation Specialist:** Has **Write-Access** tools. It handles `UPDATE` and `DELETE` queries with built-in confirmation logic.

## 4. Building the Toolset
Tools are the "hands" of your agents.
*   **Search FAQ Tool:** Wraps your `RAGService` so agents can browse documentation.
*   **Database Tools:** Python functions using `sqlite3` to fetch specific data points.
*   **Communication Tool:** Use CrewAI's `delegate_work_to_coworker` to let agents ask each other for help.

## Implementation Roadmap (Phased Development)

### Phase 1: The Gateway (The Gatekeeper)
*   **Goal:** Implement the "Fast Path" to answer FAQs in < 2 seconds.
*   **Key Logic:** Intent detection (regex/LLM) and Fast RAG check.
*   **Success Metric:** System answers "What is your return policy?" without starting a CrewAI process.

### Phase 2: The Policy Expert
*   **Goal:** Build a specialized agent for deep knowledge retrieval.
*   **Tools:** `search_company_faq`.
*   **Role:** Handles complex, multi-part policy questions that the Gatekeeper might find ambiguous.

### Phase 3: The Data Investigator (Read-Only)
*   **Goal:** Build a "Fact-Finding" agent for order and product data.
*   **Tools:** `get_order_status`, `get_customer_info`, `search_catalog`.
*   **Restriction:** Strict **Read-Only** access to the SQLite database. No update logic allowed.

### Phase 4: The Action Specialist (Write-Enabled)
*   **Goal:** Enable the system to perform real changes (Update/Cancel).
*   **Tools:** `update_order_details`, `cancel_order`, `request_refund`.
*   **Guardrails:** Must implement a "Confirm-First" tool that waits for user approval before modifying the DB.

### Phase 5: The Crew Orchestration
*   **Goal:** Connect all agents using the `SupportCrew` class.
*   **Logic:** Implement delegation rules so the Policy Expert knows to ask the Data Investigator for order dates before giving a refund answer.

### Phase 6: Full Integration
*   **Goal:** Connect the backend `AgenticAssistant` to the Next.js frontend.
*   **Testing:** End-to-end testing from the Chat UI to the SQLite database.

---
**Note:** Always prioritize the **Fast Path** for general questions to keep the user experience snappy. Only escalate to **Agents** when specific data or complex logic is required.
