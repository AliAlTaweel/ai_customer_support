# Luxe AI Customer Support - System Architecture

This document describes the modern, optimized hybrid workflow and agentic pipeline of the Luxe AI Customer Support system.

## 🔄 Modern Hybrid Workflow Diagram

The system combines a sub-100ms **Fast-Track bypass pipeline** for predictable, structured queries with a fallback **Unified CrewAI Agentic Pipeline** to handle complex, multi-step customer intents.

```mermaid
graph TD
    %% Inputs
    User([Customer Message]) --> CrewService[CrewService: kickoff_chat]

    %% Phase 1: Fast-Track
    CrewService --> Phase1{Phase 1: Fast-Track Bypass?}
    Phase1 -- "Match Found (Sub-100ms)" --> FastTrackService[FastTrackService]
    FastTrackService --> DirectResponse[/Instant Direct Response/]

    %% Phase 2: Scrubbing & Phase 3: Routing
    Phase1 -- "Complex / Unstructured" --> PrivacyScrubber[Phase 2: PrivacyScrubber]
    PrivacyScrubber -- "Pseudonymized Text" --> IntentRouter{Phase 3: Intent Router}

    %% Phase 4 & 5: CrewAI & Processing
    IntentRouter --> UnifiedSpecialist[Phase 4: Unified Luxe Specialist Agent]
    UnifiedSpecialist --> SpecialistTools[["search_products<br/>get_order_details<br/>cancel_order_fn<br/>place_order_fn<br/>get_company_faq_fn"]]
    SpecialistTools --> SignalProcessor[Phase 5: Signal Processor]

    %% Phase 6: Cleaning
    SignalProcessor --> ResponseCleaner[Phase 6: ResponseCleaner & Detokenizer]
    ResponseCleaner --> FinalOutput[/Polished On-Brand Natural Response/]

    %% Output
    DirectResponse --> End((Customer))
    FinalOutput --> End

    %% Styling
    style User fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style End fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style FastTrackService fill:#e1f5fe,stroke:#01579b,color:#000
    style PrivacyScrubber fill:#fff3e0,stroke:#e65100,color:#000
    style IntentRouter fill:#ffe0b2,color:#000
    style UnifiedSpecialist fill:#e8f5e9,stroke:#1b5e20,color:#000
    style SpecialistTools fill:#c8e6c9,color:#000
    style ResponseCleaner fill:#d1c4e9,stroke:#311b92,color:#000
```

---

## 🛠️ Core System Components

### 1. The Entry Point (`CrewService`)
The [CrewService](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/backend/app/services/crew_service.py#L16) acts as the central conductor. When a message is received, it executes the routing logic:
1.  **Fast-Track Assessment**: Immediately runs regex, direct RAG FAQ indexes, or pending order confirmation hooks via [FastTrackService](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/backend/app/services/fast_track_service.py#L7) to check if the LLM can be bypassed.
2.  **PII Pseudonymization**: Sanitizes input using [PrivacyScrubber](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/backend/app/core/privacy.py#L31) to strip sensitive details (names, emails, phones, addresses) before external network calls.
3.  **Unified Specialist Execution**: Invokes a single-agent CrewAI environment for complex reasoning.

### 2. Fast-Track Pipeline (`FastTrackService`)
To minimize token costs and ensure instant response latency (<100ms):
*   **Greetings & Follow-ups**: Handled statically.
*   **Direct Order Lookup & Tracking**: Fetches active status and injects live tracking coordinates directly from database queries.
*   **Local RAG FAQ Engine**: Employs local HuggingFace embeddings and a **FAISS vector index** to answer common company policies instantly.

### 3. Unified Luxe Specialist Agent (CrewAI)
Unlike legacy implementations that split operations across three separate sequential agents (Knowledge, Order, and Response Specialists), we now use a single **Unified Luxe Specialist**:
*   **Role**: Expert transactional assistant with full tooling access (`get_company_faq`, `search_products`, `order_management`, etc.).
*   **Goal**: Executes actions and gathers necessary data in a single pass, eliminating sequential agent handoff latency and instruction token bloat.

### 4. Signal Processor (`SignalProcessor`)
Translates machine-readable states returned by agents (such as `PRODUCT_LIST: [...]`, `CHECKOUT_REQUIRED`, or `TRACKING_INFO: { ... }`) into clean JSON payloads. This lets the frontend chat widget render dynamic progress bars, shipping maps, and product carousels seamlessly.

### 5. Response Cleaner & Detokenizer (`ResponseCleaner`)
Extracts final natural language answers, strips internal agent instructions or symbols, and detokenizes PII tags back into original values so the customer receives a personalized response.

---

## 💡 Why this Hybrid Pipeline is Superior to Legacy Multi-Agent Designs

1.  **Eliminated Agent-Handoff Latency**: The legacy 3-agent pipeline required sequentially sending inputs through three separate LLM reasoning cycles. Our hybrid pipeline resolves simple questions in **sub-100ms** and complex ones with only **one LLM cycle**.
2.  **Reduced Token Bloat**: Legacies repeated backstories and system instructions across three different agents. The Unified Agent layout cuts prompt size by more than **50%**.
3.  **Strict GDPR Security**: Real-time pseudonymization secures customer data before any third-party AI processing.
