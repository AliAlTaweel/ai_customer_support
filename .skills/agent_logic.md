# Logic Definition: Support Agent

This document defines the agentic behavior and the specific tools available to the system for transactional problem solving.

## 1. The ReAct Reasoning Loop
The support agent uses a **Thought-Action-Observation** loop (ReAct) to solve queries that require real-time data access.

1.  **Thought**: Analyze the user's intent and determine if/which database tool is required.
2.  **Action**: Execute the specific tool against the local database (`mvp.db`).
3.  **Observation**: Receive the tool output and interpret the result.
4.  **Final Answer**: Formulate a natural language response based on the actual database state.

## 2. SQL Tools (Read-Only)
The agent is empowered with the following tools to solve account and order issues:

| Tool Name | Input | Responsibility |
| :--- | :--- | :--- |
| `get_order_status` | `order_id` (int) | Fetches order status, amount, and date from `orders`. |
| `get_customer_info` | `email` (str) | Fetches customer name, country, and signup data from `customers`. |
| `search_products` | `query` (str) | Searches the `products` table for catalog information. |

## 3. Fallback Protocols
*   **Missing Data**: If a tool returns "not found", the agent must explicitly state it cannot find the record and ask the user for clarification (e.g., "Could you double-check your order ID?").
*   **Ambiguous Requests**: If a query is unclear, the agent must ask for the specific piece of data (Order ID or Email) before attempting to call a tool.
