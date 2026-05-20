# Luxe AI Customer Support - UML Diagrams

This document provides a comprehensive UML representation of the **Luxe AI Customer Support** project, covering system components, data flows, and class-level structure.

---

## 1. 🧩 Component Diagram

Visualizes the logical organization of system components, their relationships, and dependencies between subsystems.

```mermaid
graph TD
    subgraph "Frontend (Next.js)"
        CI[ChatInterface] --> CH[ChatHeader]
        CI --> CInput[ChatInput]
        CI --> MI[MessageItem]
        CI --> ACT[ActionStates]
        ACT --> CF[CheckoutForm]
        ACT --> TM[TrackingMap]
    end

    subgraph "Backend (FastAPI)"
        API[API Gateway / Chat Router]
        NAS[NativeAgentService]
        FTS[FastTrackService]
        PS[PrivacyScrubber]
        RC[ResponseCleaner]
        TS[TelemetryService]
        
        subgraph "Business Logic & Tools"
            OT[OrderTools]
            PT[ProductTools]
            ST[SupportTools]
            FAQ[FAQTools]
        end
    end

    subgraph "Database (PostgreSQL/RDS)"
        DB[(Users / Orders / History)]
    end

    subgraph "External Integrations"
        Gemini{{Google Gemini AI}}
        FAISS{{FAISS Local RAG}}
    end

    %% Relationships
    User[Customer] --> CI
    CI -->|HTTP POST| API
    API --> NAS
    NAS --> FTS
    NAS --> PS
    NAS --> Gemini
    NAS --> RC
    NAS --> TS
    
    FTS --> FAISS
    FTS --> DB
    
    Gemini -->|Function Call| OT
    Gemini -->|Function Call| PT
    Gemini -->|Function Call| ST
    Gemini -->|Function Call| FAQ
    
    OT --> DB
    PT --> DB
    TS --> DB
```

---

## 2. 🚀 Sequence Diagram: Chat Message Flow

Traces the lifecycle of a customer inquiry as it moves from the frontend widget through the hybrid pipeline and back.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant F as Frontend (React)
    participant API as FastAPI Router
    participant NA as NativeAgentService
    participant FT as FastTrackService
    participant P as PrivacyScrubber
    participant LLM as Gemini AI
    participant T as Tools/DB
    
    C->>F: Type: "Where is my order ORD-123?"
    F->>API: POST /chat/chat {message: "...", state: {...}}
    API->>NA: kickoff_chat(message)
    
    rect rgb(240, 240, 255)
        Note over NA, FT: Phase 1: Fast-Track Assessment
        NA->>FT: handle_immediate_responses()
        FT-->>NA: None (Requires Complex Lookup)
    end

    rect rgb(255, 245, 235)
        Note over NA, P: Phase 2: PII Redaction
        NA->>P: pseudonymize_text(message)
        P-->>NA: scrubbed_message, pii_mapping
    end

    rect rgb(235, 255, 235)
        Note over NA, LLM: Phase 3: AI Reasoning Loop
        NA->>LLM: start_chat(history)
        NA->>LLM: send_message(scrubbed_message)
        LLM-->>NA: FunctionCall(get_order_details)
        
        NA->>T: get_order_details("ORD-123")
        T-->>NA: { status: 'Shipped', coordinates: {...} }
        
        NA->>LLM: send_message(tool_response)
        LLM-->>NA: JSON Response { message: "...", ui_signals: ["TRACKING_INFO"], payload: {...} }
    end
    
    rect rgb(245, 240, 255)
        Note over NA, F: Phase 4: Response Assembly
        NA->>NA: detokenize_response(pii_mapping)
        NA-->>API: { result: "...", signals: [...], usage: {...} }
    end
    
    API->>T: save_chat_message_fn()
    API-->>F: HTTP 200 ChatResponse
    
    F->>C: Render Map View & Typewriter Response
```

---

## 🏛️ 3. Class Diagram: Backend Core

Details the static relationships, attributes, and methods of the core backend service classes.

```mermaid
classDiagram
    class NativeAgentService {
        +FastTrackService fast_track
        +ResponseCleaner cleaner
        +list tools
        +string system_instruction
        +object model
        
        +kickoff_chat(user_message, history, user_name, state) Dict
        +get_greeting(first_name) Dict
    }
    
    class FastTrackService {
        +object tokenizer
        +object faiss_index
        +handle_immediate_responses(msg, clean_msg, state) Dict
        +get_greeting(user_name) Dict
        -_handle_status_inquiry() Dict
    }
    
    class PrivacyScrubber {
        <<static>>
        +pseudonymize_text(text) Tuple
        +detokenize_text(text, mapping) string
        +mask_name(name) string
    }
    
    class ResponseCleaner {
        +clean_and_format(text, pii_mapping) string
        -_strip_internal_signals(text) string
    }
    
    class TelemetryService {
        +record_metric(pipeline_type, latency)
        +get_latest_metrics() Dict
    }
    
    class ChatRouter {
        <<APIRouter>>
        +chat(ChatRequest) ChatResponse
        +greet(GreetRequest)
        +get_history()
        -_check_rate_limit(key) bool
    }

    class ToolsModule {
        <<module>>
        +search_products()
        +get_order_details()
        +cancel_order()
        +place_order()
        +submit_complaint()
        +get_company_faq()
    }

    ChatRouter ..> NativeAgentService : Instantiates
    NativeAgentService --> FastTrackService : composition
    NativeAgentService --> ResponseCleaner : composition
    NativeAgentService ..> PrivacyScrubber : calls static
    NativeAgentService ..> TelemetryService : logs to
    NativeAgentService ..> ToolsModule : utilizes
    FastTrackService ..> ToolsModule : utilizes directly
```

---

## 📐 Diagram Annotations & Architectural Shifts

*   **Unified Hybrid Driver**: The architecture emphasizes a hybrid flow where deterministic queries (Fast-Track) bypass the LLM entirely for ~100ms responses, while unstructured queries delegate to `NativeAgentService`.
*   **NativeAgent Migration**: Replaced legacy multi-agent system (CrewAI) with direct Gemini `NativeAgentService` leveraging Native Function Calling, decreasing latency and token bloat.
*   **Telemetry integration**: Seamless capture of latency and successful requests injected from backend to visual observability panels.
