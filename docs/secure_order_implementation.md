# Secure Order & Authentication Implementation Plan

This document outlines the phases required to transition the AI Customer Support system from a proof-of-concept to a secure, production-ready transactional platform.

## Phase 1: Backend Security & Identity
**Goal:** Establish user identity and protect API endpoints.
- [x] Create `app/core/auth.py` to handle JWT/API Key verification.
- [x] Update `app/api/endpoints/chat.py` to require authentication.
- [x] Extract user identity (Name, Email) from the request context.
- [x] Pass verified user identity into the `CrewService`.

## Phase 2: Tool Hardening & Address Support
**Goal:** Ensure tools are secure and support physical delivery.
- [x] Update `place_order` tool in `database_tools.py` to accept `shipping_address`.
- [x] Modify `cancel_order` and `get_order_details` to strictly require `authenticated_email` for non-guest lookups.
- [x] Update SQL queries to include `WHERE customerEmail = :auth_email` to prevent cross-user data access (IDOR protection).
- [x] Instruct LLM to inject the `[AUTH_EMAIL]` token into tool calls to automate ownership verification.

## Phase 3: Transactional Agent Refinement
**Goal:** Guide the user through a secure checkout "interview".
- [x] Update `Transactional Operations Specialist` in `factory.py`.
- [x] Add explicit instructions to:
    - [x] Use verified context instead of asking for email.
    - [x] Mandatory collection of First Name, Last Name, and Shipping Address.
    - [x] Present a summary of the order before execution.
    - [x] Wait for explicit user confirmation (Yes/No).

## Phase 4: Frontend Integration
**Goal:** Connect the UI to the secure backend.
- [x] Update frontend to store and send the `Authorization` token in the `/chat` request.
- [x] (Optional) Add a visual "Confirm Order" button or card to improve UX.

## Phase 5: Testing & Validation
**Goal:** Verify security boundaries.
- [x] Test that User A cannot cancel User B's order.
- [x] Test that the agent correctly identifies missing address information.
- [x] Verify that tool calls only happen after confirmation.
