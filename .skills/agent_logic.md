# Logic Definition: Customer Support Crew

This document defines the roles, goals, and logic of the specialized agents that make up the system's "brain".

## 1. Agent Roles & Personas

### Policy Support Specialist
- **Role**: Senior Support Strategist
- **Goal**: Resolve user questions by searching company policies and FAQ.
- **Responsibility**: First responder. Analyzes intent and uses the `search_company_faq` tool. Can delegate tasks to the Order Manager if transactional data is needed.
- **Backstory**: A veteran at the support desk who knows all rules inside and out.

### Order & Catalog Manager
- **Role**: Customer Data Manager
- **Goal**: Fetch specific data (orders, profiles, products) from the SQL database.
- **Responsibility**: Accurate data retrieval. Uses `get_order_status`, `get_customer_info`, and `search_products`.
- **Backstory**: Secure and precise gatekeeper of the `mvp.db`.

## 2. Multi-Agent Delegation Logic
The system uses a **Sequential Process** with optional **Task Delegation**:
1.  **Direct Retrieval**: If a query is purely transactional ("Status of order 3"), the Order Manager handles it.
2.  **Collaborative Handoff**: If a query is mixed ("What is your refund policy for my order 3?"), the Policy Specialist retrieves the rules and then hires the Order Manager to fetch the specific order data.
3.  **Synthesis**: The final output is a consolidated, professional response that combines data and policy.

## 3. Fallback Protocols
- **Data Not Found**: If a database tool returns "not found", the agent must report this as a final answer rather than retrying.
- **Privacy Enforcement**: Agents are instructed to only use the user's first name provided in the context, ensuring no sensitive data leak.
- **Out of Scope**: Off-topic queries are intercepted by the Intent Router before reaching the Crew.
