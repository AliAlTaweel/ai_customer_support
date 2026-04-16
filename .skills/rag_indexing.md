# Local RAG: Indexing & Retrieval Procedure

This document defines the procedure for preparing and maintaining the local knowledge base.

## 1. Data Ingestion & Sync
The primary source of knowledge is **`FAQ/faq.json`**.
- **Indexing Dashboard**: Updates can be triggered and monitored via the `/indexing` route in the frontend.
- **Backend Sync**: `backend/indexer.py` handles the ingestion, chunking, and database population.

## 2. Embedding Configuration
The system uses the following configuration to ensure privacy and low latency:
- **Embedding Model**: `nomic-embed-text` (via Ollama).
- **Vector Database**: **ChromaDB** (persistent local store at `db/vector_store`).
- **Collection**: `faq_collection`.

## 3. Retrieval Strategy (RAG Tool)
Retrieval is encapsulated in the `search_company_faq` tool used by the **Support Specialist** agent:
- **Top-K**: The system retrieves the top **3** most similar chunks.
- **Context Injection**: Retrieved snippets are injected into the system prompt of the Llama 3.1 model.
- **Verification**: The agent is instructed to only answer if the context contains the information; otherwise, it must admit it doesn't know.

## 4. Maintenance
- **Re-indexing**: Re-trigger indexing via the dashboard whenever the `faq.json` file is modified.
- **Cleaning**: The indexer wipes the old collection before re-indexing to ensure data consistency.
