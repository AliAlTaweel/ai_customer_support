# Local RAG: Indexing Procedure

This document defines the procedure for preparing and maintaining the local knowledge base.

## 1. Data Ingestion
The primary source of knowledge for the RAG system is **`FQA/fqa.json`**.
Each entry in the JSON must be transformed into a document chunk.

## 2. Embedding Configuration
The system uses the following local embedding configuration to ensure consistency:
*   **Local Engine**: Ollama or a similar local inference server.
*   **Embedding Model**: `nomic-embed-text` or `all-MiniLM-L6-v2`.
*   **Vector Database**: ChromaDB (persistent local SQLite-based store).

## 3. Retrieval Strategy
*   **Chunk Representation**: `Question: {question} \n Answer: {answer}`
*   **Similarity Metric**: Cosine Similarity.
*   **Top-K**: The system should retrieve the top `3` most similar documents to provide sufficient context.

## 4. Maintenance
*   **Re-indexing**: Whenever `FQA/fqa.json` is updated, the local ChromaDB must be refreshed to include the latest entries.
*   **Versioning**: Keep versions of the vector data synchronized with the knowledge source (`fqa.json`).
