# AI Assistant Improvement Plan

This document outlines the planned improvements and architectural upgrades for the Luxe AI Customer Support Assistant to enhance performance, accuracy, and user experience.

## 1. Memory and Context Management
- **Short-Term Memory**: Expand session-based memory in the native chat session history (passing a structured history of past user and model turns) so the agent can seamlessly recall details (like order numbers or product names) shared earlier in the current conversation.
- **Long-Term Memory**: Integrate persistent user profile memory using our database to store user preferences and summarize past interactions, allowing the agent to offer a more personalized experience across multiple sessions.

## 2. Streaming Responses for Lower Latency
- **Token Streaming**: Currently, the Gemini chat session calls block execution until the complete response is generated. We will implement Gemini native token streaming (`send_message_stream`) to send tokens to the frontend `/chat` endpoint sequentially, reducing perceived latency.

## 3. Advanced RAG (Retrieval-Augmented Generation)
- **Hybrid Search**: Upgrade the current FAISS vector search in the `get_company_faq` tool to use Hybrid Search (Keyword/BM25 + Semantic/Dense Vectors). This ensures better retrieval for specific product names or exact policy terms.
- **Document Re-ranking**: Introduce a lightweight re-ranker (e.g., Cohere Rerank or a Cross-Encoder) to sort the retrieved context chunks, ensuring the most relevant policy documents are prioritized in the LLM's context window.

## 4. Guardrails and Structured Tool Outputs
- **Strict Pydantic Validation**: Enforce strict Pydantic schema validation for critical tools like `place_order` and `cancel_order`. This prevents the agent from hallucinating parameters or passing incorrect data types to the database.
- **Enhanced Intent Routing**: Refine the prompt logic in `NativeAgentService` to ensure strict delegation boundaries, preventing context leakage between sales workflows and sensitive operations like order cancellations.

## 5. Human-in-the-Loop (Handoff Protocol)
- **Escalation Tool**: Develop an `escalate_to_human` tool. If the agent cannot resolve an issue, repeatedly fails tool validation, or if the user explicitly requests human assistance, the agent will trigger this tool to flag the ticket in the database for human review.

## 6. Asynchronous Execution
- **Async Database Tools**: Transition our database tools (`search_products`, `get_order_details`) to use Python's `async/await` pattern alongside SQLAlchemy's async engine. This will prevent I/O blocking and improve the backend's ability to handle multiple concurrent customer chats efficiently.
