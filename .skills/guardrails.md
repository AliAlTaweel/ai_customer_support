# Logic Definition: AI Guardrails

This document defines the safety and scope enforcement logic used to protect the integrity of the Customer Support AI.

## 1. Intent Classification (Scope Guard)
Before any reasoning begins, every user query is processed by a dedicated **Intent Router**. This router enforces a "Support-Only" policy.

| Intent | Scope | Action Path |
| :--- | :--- | :--- |
| `FAQ` | Company Policy, Rules, Help | Crew (Policy Expert) |
| `ACTION` | Database lookups, Orders, Products | Crew (Order Manager) |
| `OUT_OF_SCOPE` | General Chat, Trivia, Poems, Math, Counting | **Immediate Refusal** |

## 2. Refusal Policy
Requests classified as `OUT_OF_SCOPE` do not enter the reasoning loop. The system immediately returns a standard, professional refusal message:

> "I am a customer support assistant. I can only help you with questions related to our products, orders, and support policies."

## 3. Privacy Guard (GDPR)
- **Identity Masking**: The frontend (Clerk) sends only the user's `first_name` to the backend.
- **Prompt Injection Prevention**: The AI is strictly instructed to avoid requesting or displaying sensitive IDs or full names except for the `order_id` required for tools.
- **Name Personalization**: The AI uses the provided `first_name` to maintain a professional yet personal tone without exposing PII (Personally Identifiable Information).

## 4. Hallucination Guard
- **Strict Logic**: Agents are forbade from guessing data. If a tool returns "not found", the agent MUST report that result as fact instead of suggesting potential matches.
- **Source Grounding**: RAG answers must be derived from the indexed FAQ knowledge base; if no context is found, the AI must admit it doesn't know.
