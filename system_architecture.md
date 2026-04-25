# Luxe AI Customer Support - System Architecture

This document describes the workflow and agentic pipeline of the Luxe AI Customer Support system.

## Workflow Diagram

```mermaid
graph TD
    %% Input
    User((Customer Message)) --> CrewService[CrewService: kickoff_chat]

    %% CrewAI Orchestration
    subgraph "CrewAI Sequential Process"
        direction TB

        %% Agent 1
        subgraph Agent1 ["1. Knowledge Specialist (RAG)"]
            A1_Task[Task: Search FAQ]
            A1_Tool[[get_company_faq]]
            A1_Task --- A1_Tool
        end

        %% Agent 2
        subgraph Agent2 ["2. Order Operations Specialist"]
            A2_Task[Task: Database Check]
            A2_Tools[["search_products<br/>get_order_details<br/>cancel_order<br/>place_order"]]
            A2_Task --- A2_Tools
        end

        %% Agent 3
        subgraph Agent3 ["3. Customer Experience Specialist"]
            A3_Task[Task: Write Final Response]
            A3_Synthesis{Synthesize Info}
        end
    end

    %% Flow of data
    CrewService --> Agent1
    Agent1 -- "FAQ Result / NO_FAQ_RESULT" --> Agent2
    Agent2 -- "Order Data / NOT_APPLICABLE" --> Agent3
    
    %% Context passing to Final Agent
    Agent1 -.-> |Provides Context| Agent3
    Agent2 -.-> |Provides Context| Agent3

    %% Output
    Agent3 --> FinalOutput[/Clean Natural Language Response/]
    FinalOutput --> Result((Customer))

    %% Styling
    style User fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Result fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Agent1 fill:#e1f5fe,stroke:#01579b,color:#000
    style Agent2 fill:#fff3e0,stroke:#e65100,color:#000
    style Agent3 fill:#e8f5e9,stroke:#1b5e20,color:#000
    style A1_Tool fill:#b3e5fc,color:#000
    style A2_Tools fill:#ffe0b2,color:#000
    style FinalOutput fill:#d1c4e9,stroke:#311b92,color:#000
```

## System Components

### 1. The Entry Point (`CrewService`)
The `kickoff_chat` function in `backend/app/services/crew_service.py` is the conductor. It takes the user's message and history, then starts the sequential process.

### 2. Knowledge Specialist (RAG Agent)
*   **Role:** Expert on company policies.
*   **Tool:** `get_company_faq` (searches `FAQ/faq.json`).
*   **Job:** Finds the "ground truth" for any general question. If it can't find anything, it returns `NO_FAQ_RESULT`.

### 3. Order Operations Specialist (Transaction Agent)
*   **Role:** Handles all database actions.
*   **Tools:** `search_products`, `get_order_details`, `cancel_order`, `place_order`.
*   **Job:** Executes database changes or searches. If the request is a general question (like "What time do you open?"), it returns `NOT_APPLICABLE`.

### 4. Customer Experience Specialist (Response Agent)
*   **Role:** The final voice of the brand.
*   **Job:** Receives the outputs from the first two agents. It acts as an editor, stripping away internal codes and technical jargon to produce a single, polished, warm response.

## Why Token Usage is High
Because this is a **sequential agentic pipeline**, each request involves:
1.  **Instruction Bloat:** Every agent sends their full backstory and tool definitions to the LLM.
2.  **Chain of Thought:** Each agent "thinks" internally before taking an action.
3.  **Context Chaining:** Agent 3 has to read the outputs of Agent 1 and Agent 2, increasing the input size for the final step.
