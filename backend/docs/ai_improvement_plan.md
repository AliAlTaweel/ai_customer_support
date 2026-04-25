# AI Assistant Improvement Plan

This document outlines the planned improvements and architectural upgrades for the Luxe AI Customer Support Assistant to enhance performance, accuracy, and user experience.

## 1. Memory and Context Management
- **Short-Term Memory**: Enable session-based memory in the CrewAI `Process` (`memory=True`) so agents can seamlessly recall information (like order numbers or product names) shared earlier in the current conversation.
- **Long-Term Memory**: Integrate persistent entity memory using our SQLite database to store user preferences and summarize past interactions, allowing the AI to offer a more personalized experience across multiple sessions.

## 2. Streaming Responses for Lower Latency
- **Token Streaming**: Currently, the `crew.kickoff()` function blocks execution until the complete response is generated. We will implement LLM streaming callbacks to send tokens to the frontend `/chat` endpoint sequentially. This will drastically reduce the perceived latency and improve the UX.

## 3. Advanced RAG (Retrieval-Augmented Generation)
- **Hybrid Search**: Upgrade the current FAISS vector search in the `get_company_faq` tool to use Hybrid Search (Keyword/BM25 + Semantic/Dense Vectors). This ensures better retrieval for specific product names or exact policy terms.
- **Document Re-ranking**: Introduce a lightweight re-ranker (e.g., Cross-Encoder) to sort the retrieved context chunks, ensuring the most relevant policy documents are prioritized in the LLM's context window.

## 4. Guardrails and Structured Tool Outputs
- **Strict Pydantic Validation**: Enforce strict Pydantic schema validation for critical tools like `place_order` and `cancel_order`. This prevents the `gemma4:e4b` worker agents from hallucinating parameters or passing incorrect data types to the database.
- **Enhanced Intent Routing**: Refine the Manager Agent's prompt to ensure strict delegation boundaries, preventing context leakage between sales workflows and sensitive operations like order cancellations.

## 5. Human-in-the-Loop (Handoff Protocol)
- **Escalation Tool**: Develop an `escalate_to_human` tool. If the AI cannot resolve an issue, repeatedly fails tool validation, or if the user explicitly requests human assistance, the AI will trigger this tool to flag the ticket in the database for human review.

## 6. Asynchronous Execution
- **Async Database Tools**: Transition our database tools (`search_products`, `get_order_details`) to use Python's `async/await` pattern alongside SQLAlchemy's async engine. This will prevent I/O blocking and improve the backend's ability to handle multiple concurrent customer chats efficiently.
