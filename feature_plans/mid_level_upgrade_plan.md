# Mid-Level AI Architecture Upgrade Plan

This plan is designed to reposition the LuxeCatalog project from a "showcase storefront" to a production-grade "AI Agent Orchestration Pipeline." The goal is to prove to recruiters and senior engineers that the system is reliable, safe, and evaluated programmatically.

## Phase 1: Automated Evaluation Suite (`evals/`)
*The most critical step to prove you are a mid-level AI engineer is writing automated tests for your LLM outputs.*

**Objective:** Build a Python test runner that programmatically asserts the safety, speed, and accuracy of the `NativeAgentService`.

**Tasks:**
1.  **Create Directory:** Create `backend/evals/`.
2.  **Test Cases to Implement:**
    *   **Privacy & GDPR Test:** Send an input containing a fake phone number and email. Assert that the `PrivacyScrubber` catches it before it hits the LLM.
    *   **Tool Execution Accuracy:** Send the prompt "Cancel my order 12345-abc". Assert that the agent extracts the ID and updates the state correctly without hallucinating.
    *   **Fast-Track Latency:** Send a simple greeting ("Hi"). Assert that the response bypasses the LLM and returns in `< 0.5 seconds`.
    *   **UI Signal Verification:** Ask to buy a product and assert that the response contains the exact `PLACE_ORDER_SUMMARY` signal required by the frontend.
3.  **Benchmark Report:** The script will output a clean terminal report (e.g., `[PASS] Privacy Scrubber | Latency: 0.02s`) to demonstrate CI/CD readiness.

## Phase 2: Observability & Tracing
*Mid-level engineers care about how the system runs in production, tracking costs and bottlenecks.*

**Objective:** Standardize how the agent's performance is logged and monitored.

**Tasks:**
1.  **Structured Logging:** Ensure `native_agent_service.py` outputs structured logs for each step (Phase 1: Fast-track, Phase 2: Privacy, Phase 3: LLM generation).
2.  **Performance Metrics:** Explicitly track and log Token Usage, LLM Latency, and Tool Execution Time for every request.
3.  (Optional) **LangSmith / OpenTelemetry Integration:** If desired, we can add a lightweight integration to visualize the agent's decision tree.

## Phase 3: Project Repositioning & Rebranding
*We need to change the first 5 seconds of the recruiter's experience when they open the repo.*

**Objective:** Rewrite the documentation to sound like an enterprise AI pipeline rather than a demo store.

**Tasks:**
1.  **Update README.md Title:** Change from "LuxeCatalog" or "E-Commerce Showcase" to something like: **"Enterprise AI Orchestration & Evaluation Pipeline."**
2.  **Highlight the 'Boring' Tech:** Move the `PrivacyScrubber`, `Fast-Track Router`, and `Evals Suite` to the very top of the README. These are the mid-level features. The Next.js frontend should be listed as a secondary "client implementation."
3.  **Document the Evals:** Add a section in the README titled "Evaluation & Testing" showing the output of your benchmark script.

## Phase 4: Visual Telemetry (Dev Badge)
*Expose invisible engineering improvements directly in the user interface for rapid credibility with recruiters.*

**Objective:** Inject a sleek Developer Stats badge into the chat messages to prove real-time performance tracking.

**Tasks:**
1.  **Expose Usage to State:** Ensure the Next.js frontend captures the `usage` object (tokens, latency) returned from the backend API.
2.  **UI Implementation:** Add a subtle, high-fidelity "⚡ Tech Specs" tooltip or badge at the bottom of each AI chat message.
3.  **Display Metrics:** Render the real-time Response Time (latency) and Prompt/Completion Token breakdown visibly.

## Phase 5: Frontend Transparency (System Architecture Map)
*Showcase the system design logic instantly to technical visitors.*

**Objective:** Add an on-site architecture diagram that visualizes requests moving from Frontend -> Security Interceptor -> AI Router -> Gemini Engine.

**Tasks:**
1.  **Create ArchitectureModal Component:** A reusable Shadcn `Sheet` displaying nested tailwind node diagrams of server-client interaction.
2.  **Global Injection:** Place a "System Architecture" trigger button inside the global header for maximum recruiter visibility.

---
