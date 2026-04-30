from crewai import Crew, Process
from app.agents.factory import AgentFactory
from app.tasks.factory import TaskFactory
from app.core.privacy import PrivacyScrubber
from app.core.config import settings
from typing import List, Dict, Any
import re
import logging
import json
import ast

logger = logging.getLogger(__name__)


class CrewService:
    def __init__(self):
        self.agent_factory = AgentFactory()

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None, state: Dict[str, Any] = None, user_context: Any = None, user_id: str = None) -> Dict[str, Any]:
        from litellm import completion
        state = state or {}
        
        logger.info(f"Kickoff chat request received. User ID: {user_id}, Message: {user_message}")
        
        # ── SUPER FAST TRACK: Immediate Confirmation Handling ────────────────
        # We check this BEFORE PII scrubbing and LLM routing to minimize latency (<100ms).
        clean_msg = user_message.lower().strip().strip('?!.')
        
        # Confirmation for order cancellation
        pending_order = state.get("pending_confirmation")
        if pending_order and clean_msg in ["yes", "y", "confirm", "sure", "do it"]:
            from app.tools.order_tools import cancel_order_fn
            is_auth = user_context and getattr(user_context, 'is_authenticated', False)
            
            # GDPR: Ensure PII mapping is available for detokenization (especially for [AUTH_EMAIL])
            from app.core.privacy import PII_MAPPING
            pii_mapping = state.get("pii_mapping", {})
            if is_auth:
                pii_mapping["[AUTH_EMAIL]"] = user_context.email
            PII_MAPPING.set(pii_mapping)
            
            # Use userId for ownership check if authenticated, fall back to email token
            logger.info(f"Ultra-fast-tracking order cancellation for order: {pending_order}")
            result = cancel_order_fn(
                pending_order, 
                customer_email="[AUTH_EMAIL]" if is_auth else None,
                user_id=user_id if is_auth else None
            )
            return {
                "result": result, 
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}, 
                "state_update": {"pending_confirmation": None}
            }
        
        # Confirmation for order placement
        # (Now handled via CHECKOUT_REQUIRED and the frontend form)
        if user_message == "SYSTEM_PROCESS_ORDER":
            from app.tools.order_tools import place_order_fn
            from app.tools.base import detokenize_val
            details = state.get("pending_order_details")
            if not details:
                return {
                    "result": "I'm sorry, I couldn't find the order details. Please try again.",
                    "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0},
                    "state_update": {"pending_checkout": None}
                }
            
            # Use authenticated email if available, otherwise check if it's in details
            is_auth = user_context and getattr(user_context, 'is_authenticated', False)
            
            # GDPR: Ensure PII mapping is available for detokenization if needed
            from app.core.privacy import PII_MAPPING
            pii_mapping = state.get("pii_mapping", {})
            PII_MAPPING.set(pii_mapping)
            
            # Priority: Authenticated email > Form email > PII mapping email
            email = user_context.email if is_auth else None
            if not email:
                email = details.get("customer_email")
            
            if not email:
                mapping = state.get("pii_mapping", {})
                for key, val in mapping.items():
                    if "@" in val:
                        email = val
                        break
            
            logger.info(f"Processing order checkout. Email: {email}, Auth: {is_auth}, UserID: {user_id}")
            
            items = details.get("items", [])
            for item in items:
                # detokenize product name just in case the specialist tokenized it
                item['product_name'] = detokenize_val(item.get('product_name'))
            
            if not email:
                return {
                    "result": "I'm sorry, but I need your email address to place the order. Could you please provide it?",
                    "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0},
                    "state_update": {"pending_checkout": details} # Keep the form open or allow retry
                }

            result = place_order_fn(
                customer_email=email,
                customer_name=details.get("customer_name"),
                items=details.get("items"),
                shipping_address=details.get("shipping_address"),
                payment_method=details.get("payment_method", "Card"),
                user_id=user_id if is_auth else None
            )
            
            return {
                "result": result,
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0},
                "state_update": {"pending_checkout": None, "pending_order_details": None}
            }
        
        # Confirmation for purchase summary (Fast-track to checkout)
        pending_summary = state.get("pending_order_summary")
        if pending_summary and clean_msg in ["yes", "y", "confirm", "sure", "buy", "proceed", "i want", "i want to buy"]:
            # Construct the items list for CHECKOUT_REQUIRED
            # The summary might be a string or a dict.
            if isinstance(pending_summary, dict):
                product_name = pending_summary.get("product_name")
                price = pending_summary.get("price")
                items = [{"product_name": product_name, "quantity": 1, "price": price}]
            else:
                items = [{"product_name": str(pending_summary), "quantity": 1, "price": 0.0}]
            
            checkout_payload = {"items": items}
            
            return {
                "result": "I've prepared the order details for you. Please fill out the secure checkout form below to complete your purchase.",
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0},
                "state_update": {"pending_order_summary": None, "pending_checkout": checkout_payload}
            }

        # Abort confirmation
        if (pending_order or state.get("pending_checkout") or state.get("pending_yes_no") or pending_summary) and clean_msg in ["no", "n", "cancel", "stop", "nevermind"]:
            logger.info(f"User aborted pending action.")
            return {
                "result": "No problem. I've cancelled that action. What else can I help you with?", 
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}, 
                "state_update": {"pending_confirmation": None, "pending_order_details": None, "pending_order_summary": None, "pending_checkout": None, "pending_yes_no": None}
            }

        # GDPR: Pseudonymize raw user input to protect PII from third-party LLM
        scrubbed_message, pii_mapping = PrivacyScrubber.pseudonymize_text(user_message)
        
        # GDPR: Merge mapping from state to allow detokenizing tokens from previous turns
        old_mapping = state.get("pii_mapping", {})
        pii_mapping.update(old_mapping)
        
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

        # 1. Known simple greetings
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            return self.get_greeting(user_name or "there")

        # 1.5 Fast-Track explicit cancellations to avoid LLM hallucination and reduce latency
        cancel_match = re.search(r"cancel\s+(?:this\s+)?order\s+([a-f0-9\-]{36})", clean_msg)
        if cancel_match:
            order_id = cancel_match.group(1)
            # Before fast-tracking, optionally check if order is already cancelled to prevent confusing UI, 
            # but we can rely on cancel_order_fn in the NEXT step to reject it if it's not pending.
            # So just return the confirmation requirement directly.
            final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
            return {"result": final_message, "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}, "state_update": {"pending_confirmation": order_id}}

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
            "Categorize the customer's message into exactly one category: GREETING, PURCHASE, MANAGEMENT, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID.\n"
            "Categories:\n"
            "- GREETING: Simple hellos, how are you.\n"
            "- PURCHASE: Wants to buy, search for products, or place an order.\n"
            "- MANAGEMENT: Wants to track, cancel, or check details of an existing order.\n"
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
                temperature=0.0
            )
            intent = str(router_response.choices[0].message.content).strip().upper()
            # Safety check: extract the first word if the LLM was wordy
            intent = re.sub(r'[^A-Z]', ' ', intent).split()[0] if intent else "COMPLEX"
            logger.info(f"Detected intent: {intent}")
        except Exception as e:
            logger.warning(f"Fast router failed, falling back to COMPLEX: {e}", exc_info=True)
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
            # If we have a pending confirmation, we SHOULD NOT short-circuit to a greeting
            # We let it fall through to the specialist crew so they can handle the context.
            if any(state.get(k) for k in ["pending_order_summary", "pending_yes_no", "pending_confirmation"]):
                logger.info(f"Intent was GREETING but state has pending items. Overriding intent to COMPLEX to allow specialist handling.")
                intent = "PURCHASE" if state.get("pending_order_summary") else "COMPLEX"
            else:
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
        if intent in ["PURCHASE", "MANAGEMENT"]:
            specialist = self.agent_factory.create_order_agent()
        else:
            specialist = self.agent_factory.create_unified_specialist_agent()
        response_specialist = self.agent_factory.create_response_agent()

        # Format recent history
        history_str = "\n".join(history[-6:]) if history else "No previous conversation."

        # Build Dynamic Specialist Mission based on intent
        mission = ""
        # Handle variations and keywords for robustness
        is_purchase = intent == "PURCHASE" or any(w in scrubbed_message.lower() for w in ["buy", "order", "purchase", "search"])
        is_management = intent == "MANAGEMENT" or any(w in scrubbed_message.lower() for w in ["cancel", "track", "status", "where is my"])
        
        if is_purchase and not is_management:
            mission = (
                "1. SEARCH & LIST:\n"
                "   - You MUST first search for the product(s) using 'search_products'.\n"
                "   - Present the matching products to the user in a clear, NUMBERED LIST (e.g., 1. Product A, 2. Product B).\n"
                "   - Explicitly ask the user to choose a number to proceed.\n"
                "2. PRODUCT CONFIRMATION:\n"
                "   - Once the user chooses a product number, identify that product from your previous search results.\n"
                "   - You MUST output exactly: 'PLACE_ORDER_SUMMARY: {\"product_name\": \"...\", \"price\": ..., \"imageUrl\": \"...\", \"details\": \"...\"}' with the specific product details.\n"
                "   - This will trigger interactive buttons with the image and details.\n"
                "3. CHECKOUT FLOW:\n"
                "   - After the user confirms (replies 'yes' or clicks 'Buy' on the summary), you MUST output exactly: 'CHECKOUT_REQUIRED: {\"items\": [{\"product_name\": \"...\", \"quantity\": 1, \"price\": ...}]}'.\n"
                "   - This will open the secure checkout form for shipping/payment.\n"
                "   - CRITICAL: Ensure the JSON inside CHECKOUT_REQUIRED is VALID.\n"
                "   - CRITICAL: Use signals ONLY. NEVER say 'I've placed your order' yourself."
            )
        elif is_management:
            mission = (
                "2. CANCEL/TRACK an order:\n"
                "   - You MUST first retrieve details using 'get_order_details'.\n"
                "   - Only if the status is PENDING or PROCESSING, you MUST output exactly: 'CONFIRMATION_REQUIRED: [Order ID]'.\n"
                "   - CRITICAL: Do NOT call 'get_order_details' if the user is asking to BUY a new product.\n"
                "   - You do NOT have a tool to cancel orders; use the signal."
            )
        else:
            mission = (
                "3. KNOWLEDGE/FAQ: Use 'get_company_faq'.\n"
                "4. SEARCH: Use 'search_products'.\n"
                "5. COMPLAINTS: Use 'submit_complaint'."
            )

        # Create the specialist task via TaskFactory
        specialist_task = TaskFactory.create_order_task(
            agent=specialist,
            user_message=scrubbed_message,
            history_str=history_str,
            user_info=user_info,
            mission=mission
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

        logger.info(f"Starting unified crew execution for intent: {intent}")
        crew_output = unified_crew.kickoff()
        final_message = str(crew_output).strip()
        logger.info(f"Crew execution completed. Final Message: {final_message[:100]}...")
        
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
                if "PLACE_ORDER_SUMMARY:" in t_raw or "CONFIRMATION_REQUIRED:" in t_raw or "YES_NO_REQUIRED:" in t_raw:
                    specialist_output = t_raw
                    break
                # Fallback: if it's the first task (specialist), store it as specialist_output
                if not specialist_output:
                    specialist_output = t_raw
        
        # Combine for signal detection
        signal_source = raw_full_output + "\n" + specialist_output
        logger.debug(f"Signal source for detection:\n{signal_source}")
        
        # Helper to check for a signal in text
        def has_signal(signal, text):
            return signal in text
        
        # Order Cancellation Fast-Path
        if "CONFIRMATION_REQUIRED:" in signal_source:
            match = re.search(r"CONFIRMATION_REQUIRED:\s*(\S+)", signal_source)
            order_id = match.group(1) if match else signal_source.split("CONFIRMATION_REQUIRED:")[-1].strip().split()[0]
            # GDPR: Detokenize the ID before putting it in the UI/state
            order_id = PrivacyScrubber.detokenize(order_id, pii_mapping)
            
            final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
            return {"result": final_message, "usage": usage, "state_update": {"pending_confirmation": order_id}}

        # Generic Yes/No Confirmation Fast-Path
        if "YES_NO_REQUIRED:" in signal_source:
            match = re.search(r"YES_NO_REQUIRED:\s*(.*)", signal_source)
            question = match.group(1).strip() if match else "Would you like to proceed?"
            # Remove any trailing "YES_NO_REQUIRED:" if it was at the end
            question = question.split("YES_NO_REQUIRED:")[0].strip()
            return {"result": question, "usage": usage, "state_update": {"pending_yes_no": question}}

        # Order Summary Confirmation Fast-Path
        if "PLACE_ORDER_SUMMARY:" in signal_source:
            summary_raw = signal_source.split("PLACE_ORDER_SUMMARY:")[-1].strip()
            # Remove other signals if present in the summary
            for sentinel in ["CHECKOUT_REQUIRED:", "YES_NO_REQUIRED:", "CONFIRMATION_REQUIRED:"]:
                summary_raw = summary_raw.split(sentinel)[0].strip()
            
            # Attempt to parse as JSON for structured product info
            summary_data = summary_raw
            try:
                # Find the first { and last }
                match = re.search(r'(\{.*\})', summary_raw, re.DOTALL)
                if match:
                    summary_data = json.loads(match.group(1))
            except:
                pass # Keep as raw string if JSON parsing fails
                
            return {
                "result": "Please confirm the product details below.", 
                "usage": usage, 
                "state_update": {"pending_order_summary": summary_data}
            }

        # Order Checkout (Form-based) Fast-Path
        if "CHECKOUT_REQUIRED:" in signal_source:
            checkout_data = None
            try:
                # More robust extraction using regex to find the JSON/Dict structure
                # We look for the first { after CHECKOUT_REQUIRED: and the last } in the source
                details_raw = signal_source.split("CHECKOUT_REQUIRED:")[-1].strip()
                
                # Remove markdown code blocks if present
                details_raw = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', details_raw, flags=re.DOTALL)
                
                # Find the actual JSON object
                match = re.search(r'(\{.*\})', details_raw, re.DOTALL)
                if match:
                    details_str = match.group(1)
                else:
                    details_str = details_raw

                # Aggressive cleaning for newlines and problematic whitespace
                details_str_cleaned = details_str.replace('\n', ' ').replace('\r', '').strip()
                
                # Try JSON first
                try:
                    checkout_data = json.loads(details_str_cleaned)
                except json.JSONDecodeError:
                    # Try ast.literal_eval for Python-style dicts (single quotes)
                    try:
                        checkout_data = ast.literal_eval(details_str_cleaned)
                    except Exception as e:
                        logger.error(f"Failed to parse checkout signal. Error: {e}. Source snippet: {details_str_cleaned[:100]}")
                        checkout_data = None
                
                # Deep-parse 'items' if it's still a string (LLM double-encoding)
                if checkout_data and "items" in checkout_data:
                    items_val = checkout_data["items"]
                    if isinstance(items_val, str):
                        try:
                            # Clean items_val too
                            items_val_cleaned = items_val.replace('\n', ' ').replace('\r', '').strip()
                            checkout_data["items"] = json.loads(items_val_cleaned)
                        except:
                            try:
                                checkout_data["items"] = ast.literal_eval(items_val)
                            except Exception as e:
                                logger.warning(f"Failed to parse nested items string: {e}")
            except Exception as e:
                logger.error(f"Global checkout parsing error: {e}", exc_info=True)

            if checkout_data:
                final_message = "I've prepared the order details for you. Please fill out the secure checkout form below to complete your purchase."
                return {
                    "result": final_message,
                    "usage": usage,
                    "state_update": {
                        "pending_checkout": checkout_data
                    }
                }

        # GDPR: Detokenize the response so the user sees their real info, 
        # while the LLM only processed the pseudonymized tokens.
        final_message = PrivacyScrubber.detokenize(final_message, pii_mapping)

        # Post-processing cleanup
        for sentinel in ["NOT_APPLICABLE", "NO_FAQ_RESULT", "CHECKOUT_REQUIRED:", "YES_NO_REQUIRED:", "CONFIRMATION_REQUIRED:"]:
            if sentinel in final_message:
                final_message = final_message.split(sentinel)[0].strip()
        
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
