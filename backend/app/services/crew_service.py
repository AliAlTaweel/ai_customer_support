from crewai import Crew, Process, Task
from app.agents.factory import AgentFactory
from app.tasks.factory import TaskFactory
from app.core.privacy import PrivacyScrubber
from app.core.config import settings
from typing import List, Dict, Any
import re
import logging

logger = logging.getLogger(__name__)


class CrewService:
    def __init__(self):
        self.agent_factory = AgentFactory()

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None, state: Dict[str, Any] = None, user_context: Any = None, user_id: str = None) -> Dict[str, Any]:
        from litellm import completion
        state = state or {}
        
        # GDPR: Pseudonymize raw user input to protect PII from third-party LLM
        scrubbed_message, pii_mapping = PrivacyScrubber.pseudonymize_text(user_message)
        state["pii_mapping"] = pii_mapping  # Store for state management
        
        # GDPR: Mask sensitive info from session before sending to LLM
        masked_name = PrivacyScrubber.mask_name(user_name)
        user_info = f"Customer Name: {masked_name}\n" if user_name else ""
        
        if user_id:
            user_info += f"Customer Internal ID: {user_id}\n"
        
        if user_context and getattr(user_context, 'is_authenticated', False):
            # Create a dedicated token for the authenticated user's email
            # This allows tools to detokenize it while keeping it hidden from the LLM logs.
            auth_email_token = "[AUTH_EMAIL]"
            pii_mapping[auth_email_token] = user_context.email
            user_info += f"Customer Email: {auth_email_token}\n"
            user_info += "AUTHENTICATION STATUS: VERIFIED. You do NOT need to ask for their email.\n"
        else:
            user_info += "AUTHENTICATION STATUS: GUEST. You MUST ask for their email/details if they want to place an order.\n"
        
        # Set context variable for tool-level detokenization (including the new auth token)
        from app.core.privacy import PII_MAPPING
        PII_MAPPING.set(pii_mapping)

        if user_id:
            user_info += f"CRITICAL: When placing an order, ALWAYS pass the 'user_id' ({user_id}) to the place_order tool.\n"
            if user_context and getattr(user_context, 'is_authenticated', False):
                user_info += "CRITICAL: Since user is authenticated, you MUST pass the [AUTH_EMAIL] token to the 'auth_email' parameter of the place_order tool.\n"
        
        # ── Fast Track: Regex check for extremely simple greetings ──────────
        clean_msg = scrubbed_message.lower().strip().strip('?!.')
        
        # 0. Fast Track: Pending Confirmation
        pending_order = state.get("pending_confirmation")
        if pending_order:
            zero_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
            if clean_msg in ["yes", "y", "confirm", "sure"]:
                from app.tools.database_tools import cancel_order_fn
                result = cancel_order_fn(pending_order)
                return {"result": result, "usage": zero_usage, "state_update": {"pending_confirmation": None}}
            elif clean_msg in ["no", "n", "cancel", "stop", "nevermind"]:
                return {"result": "No problem. The order cancellation has been aborted.", "usage": zero_usage, "state_update": {"pending_confirmation": None}}

        # 0b. Fast Track: Pending Order Confirmation
        pending_details = state.get("pending_order_details")
        if pending_details and clean_msg in ["yes", "y", "confirm", "sure", "do it", "place order"]:
            from app.tools.database_tools import place_order_fn
            try:
                # Fallback for missing user_id
                if "user_id" not in pending_details:
                    pending_details["user_id"] = user_id
                
                # Fallback for missing customer_email if user is authenticated
                if "customer_email" not in pending_details or "pii" in str(pending_details.get("customer_email", "")).lower():
                    if user_context and getattr(user_context, 'is_authenticated', False):
                        pending_details["customer_email"] = user_context.email
                
                logger.info(f"Fast-tracking order placement for user {user_id}")
                result = place_order_fn(**pending_details)
                
                if "Error" in result:
                    logger.error(f"Fast-track order placement failed: {result}")
                    # If it failed, we don't return immediately; we let the crew handle it 
                    # but we clear the pending state so it doesn't loop.
                    state["pending_order_details"] = None
                else:
                    return {
                        "result": result, 
                        "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}, 
                        "state_update": {"pending_order_details": None, "pending_order_summary": None}
                    }
            except Exception as e:
                logger.error(f"Critical error in fast-track order placement: {e}")
                state["pending_order_details"] = None

        # 1. Known simple greetings
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            return self.get_greeting(user_name or "there")

        # 2. Gatekeeper: Catch extremely short or single-character noise
        if len(clean_msg) < 2:
            return self.get_clarification_response()
            
        # 3. Gatekeeper: Catch known short nonsense or "test" strings (optional, can be expanded)
        if clean_msg in ["test", "bot", "anyone"]:
            return {
                "result": "I'm here and ready to help! Could you please tell me more about what you're looking for?",
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
            }

        # ── Step 1: Fast Routing (LiteLLM) ──────────────────────────────────
        # We use a direct LLM call instead of a full CrewAI Agent to save ~3s overhead.
        # GDPR: We still use the scrubbed_message to ensure no PII leaks to the LLM provider.
        router_prompt = (
            "You are the Traffic Controller for Luxe, a premium retail brand (Home, Electronics, Clothing, Sports).\n"
            "Categorize the customer's message into exactly one category: GREETING, ORDER, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID.\n"
            "Categories:\n"
            "- GREETING: Simple hellos, how are you.\n"
            "- ORDER: Placing orders, tracking, cancelling, or searching products.\n"
            "- KNOWLEDGE: Questions about policies, shipping times, or brand info.\n"
            "- COMPLAINT: Expressing frustration, reporting issues, or wanting to contact admin.\n"
            "- COMPLEX: Requests needing multiple steps or combinations.\n"
            "- INVALID: Off-topic requests (cars, medical, other brands).\n\n"
            "Output ONLY the category name."
        )
        
        try:
            router_response = completion(
                model=settings.WORKER_MODEL,
                messages=[
                    {"role": "system", "content": router_prompt},
                    {"role": "user", "content": scrubbed_message}
                ],
                max_tokens=10,
                temperature=0
            )
            intent = str(router_response.choices[0].message.content).strip().upper()
            # Safety check: extract the first word if the LLM was wordy
            intent = re.sub(r'[^A-Z]', ' ', intent).split()[0] if intent else "COMPLEX"
        except Exception as e:
            logger.warning(f"Fast router failed, falling back to COMPLEX: {e}")
            intent = "COMPLEX"

        # ── Step 2: Handle Simple Intent Paths ────────────────────────────
        if "INVALID" in intent:
            if len(user_message.split()) > 3:
                return {
                    "result": "I'm sorry, but I can only assist with Luxe products, orders, and company policies. That request seems to be outside of my current scope.",
                    "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
                }
            return self.get_clarification_response()

        if intent == "GREETING" and "ORDER" not in clean_msg and "knowledge" not in clean_msg:
            return self.get_greeting(user_name or "there")

        # 2b. Fast Track: Simple Complaint (Ask for details before spinning up specialist)
        is_simple_complaint = (intent == "COMPLAINT" or "admin" in clean_msg or "complain" in clean_msg) and len(user_message.split()) < 8
        if is_simple_complaint:
            return {
                "result": "I'm sorry to hear you're having trouble. I can certainly help you get a message to our administration team. Could you please provide the details of your complaint or the message you'd like to send?",
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}
            }

        # ── Step 3: Unified Specialist Crew ──────────────────────────────
        # We use ONE specialist with ALL tools to minimize task switching.
        specialist = self.agent_factory.create_unified_specialist_agent()
        response_specialist = self.agent_factory.create_response_agent()

        # Format recent history
        history_str = "\n".join(history[-6:]) if history else "No previous conversation."

        # Create a single specialist task based on the intent
        specialist_task = Task(
            description=(
                f"{user_info}\n"
                f"History:\n{history_str}\n\n"
                f"Message: '{scrubbed_message}'\n\n"
                f"Intent: {intent}\n\n"
                "YOUR MISSION:\n"
                "1. If the user wants to PLACE an order:\n"
                "   - You MUST collect: customer_name, customer_email, shipping_address, and items.\n"
                "   - Use the 'user_info' above for name/email if available. Don't ask again if verified.\n"
                "   - If ANY detail is missing, ask the user for it politely.\n"
                "   - Once you have ALL details:\n"
                "     a) Check history: Has the user ALREADY explicitly confirmed THIS order summary (yes/confirm)?\n"
                "     b) If NOT yet confirmed: You MUST NOT call 'place_order'. Instead, output exactly:\n"
                "        'PLACE_ORDER_SUMMARY: [human-readable summary]' and 'PLACE_ORDER_DETAILS: [JSON with items, address, name, email]'.\n"
                "     c) If they just confirmed, call the 'place_order' tool and return the RESULT.\n"
                "2. If the user wants to CANCEL an order:\n"
                "   - Even if the user provides the Order ID, you MUST FIRST ask for confirmation if this is the start of the cancellation request. "
                "   - Output exactly: 'CONFIRMATION_REQUIRED: [Order ID]' and do NOT call 'cancel_order' yet. "
                "   - Only call 'cancel_order' (with confirmed=True) if the conversation history shows you already asked for confirmation and the user just said 'yes'.\n"
                "3. For KNOWLEDGE/FAQ: Use 'get_company_faq'.\n"
                "4. For SEARCH: Use 'search_products'.\n"
                "5. For COMPLAINTS: Use 'submit_complaint'.\n\n"
                "CRITICAL: If 'Customer Email' is '[AUTH_EMAIL]', you MUST pass this token to the 'auth_email' parameter of ANY tool you call (cancel_order, get_order_details, etc.). This is required for security verification.\n"
                "CRITICAL: NEVER invent an Order ID or Reference ID. NEVER claim an order is placed unless you have a success message from the 'place_order' tool."
            ),
            expected_output="Tool result, PLACE_ORDER_SUMMARY, CONFIRMATION_REQUIRED, or a direct answer.",
            agent=specialist
        )

        # ── Step 4: Final Response Task ───────────────────────────────────
        response_task = TaskFactory.create_response_task(
            agent=response_specialist,
            user_message=scrubbed_message,
            history_str=history_str,
            user_info=user_info,
            raw_output="The specialist has gathered the necessary info (order status, product details, or signals). Please review the specialist's task output to write your final response."
        )
        response_task.context = [specialist_task]

        # Build and kickoff the unified crew
        unified_crew = Crew(
            agents=[specialist, response_specialist],
            tasks=[specialist_task, response_task],
            process=Process.sequential,
            verbose=True,
            memory=False
        )

        crew_output = unified_crew.kickoff()
        final_message = str(crew_output).strip()
        
        # Extract Token Usage
        usage = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "successful_requests": 0,
        }
        if hasattr(crew_output, "token_usage"):
            usage = {
                "total_tokens": getattr(crew_output.token_usage, "total_tokens", 0),
                "prompt_tokens": getattr(crew_output.token_usage, "prompt_tokens", 0),
                "completion_tokens": getattr(crew_output.token_usage, "completion_tokens", 0),
                "successful_requests": getattr(crew_output.token_usage, "successful_requests", 1)
            }

        # ── Step 5: Fast-Path Result Analysis ─────────────────────────────
        # Check if ANY task produced a specific signal we need to act on in the state.
        # We check both the final output and the specialist's specific output.
        raw_full_output = str(crew_output.raw) if hasattr(crew_output, "raw") else final_message
        
        # Check specialist task output specifically for signals
        specialist_output = ""
        if hasattr(crew_output, "tasks_output") and crew_output.tasks_output:
            for task_out in crew_output.tasks_output:
                # The specialist task is the first one, or we check for signals in any task output
                t_raw = str(task_out.raw)
                if "PLACE_ORDER_SUMMARY:" in t_raw or "CONFIRMATION_REQUIRED:" in t_raw:
                    specialist_output = t_raw
                    break
                # Fallback: if it's the first task (specialist), store it as specialist_output
                if not specialist_output:
                    specialist_output = t_raw
        
        # Combine for signal detection
        signal_source = raw_full_output + "\n" + specialist_output
        
        # Order Cancellation Fast-Path
        if "CONFIRMATION_REQUIRED:" in signal_source:
            match = re.search(r"CONFIRMATION_REQUIRED:\s*([a-f0-9-]+)", signal_source)
            order_id = match.group(1) if match else signal_source.split("CONFIRMATION_REQUIRED:")[-1].strip().split()[0]
            final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
            return {"result": final_message, "usage": usage, "state_update": {"pending_confirmation": order_id}}

        # Order Placement Fast-Path
        if "PLACE_ORDER_SUMMARY:" in signal_source:
            order_summary = signal_source.split("PLACE_ORDER_SUMMARY:")[-1].split("PLACE_ORDER_DETAILS:")[0].strip()
            order_details = None
            if "PLACE_ORDER_DETAILS:" in signal_source:
                try:
                    import json
                    details_str = signal_source.split("PLACE_ORDER_DETAILS:")[-1].strip()
                    details_str = re.sub(r'```json\s*|\s*```', '', details_str)
                    # Find the first { and last } to extract JSON if there's extra text
                    start = details_str.find('{')
                    end = details_str.rfind('}') + 1
                    if start != -1 and end != 0:
                        details_str = details_str[start:end]
                    order_details = json.loads(details_str)
                except Exception as e:
                    logger.error(f"Failed to parse order details JSON: {e}")

            final_message = (
                f"Here's a summary of your order:\n\n{order_summary}\n\n"
                "Would you like me to go ahead and place this order? Reply **yes** to confirm or **no** to cancel."
            )
            return {
                "result": final_message, 
                "usage": usage, 
                "state_update": {
                    "pending_order_summary": order_summary,
                    "pending_order_details": order_details
                }
            }

        # GDPR: Detokenize the response so the user sees their real info, 
        # while the LLM only processed the pseudonymized tokens.
        final_message = PrivacyScrubber.detokenize(final_message, pii_mapping)

        # Post-processing cleanup
        for sentinel in ["NOT_APPLICABLE", "NO_FAQ_RESULT"]:
            final_message = final_message.replace(sentinel, "").strip()
        final_message = re.sub(r"(Final Answer:|Final Response:|Agent Output:|Response from \w[\w ]*:)", "", final_message, flags=re.IGNORECASE).strip()
        final_message = re.sub(r"\n{3,}", "\n\n", final_message).strip()

        if not final_message or len(final_message) < 10:
            final_message = "I'm sorry, I wasn't able to find a specific answer. How else can I help?"

        return {"result": final_message, "usage": usage}

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        # Optimization: Return a static greeting instead of spinning up a full CrewAI agent.
        # This reduces token usage from ~700 to 0 and eliminates LLM latency.
        greeting = (
            f"Hello {first_name}, welcome to Luxe. As your dedicated assistant, I can help you with "
            "everything from product discovery and tracking your order to clarifying our company policies. "
            "Is there anything I can assist you with today?"
        )
        
        return {
            "result": greeting,
            "usage": {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
        }

    def get_clarification_response(self) -> Dict[str, Any]:
        """Return a static response for very short or ambiguous inputs to save tokens."""
        return {
            "result": "I didn't quite catch that. Could you please provide a bit more detail so I can assist you better?",
            "usage": {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
        }
