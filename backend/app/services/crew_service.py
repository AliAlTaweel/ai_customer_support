from crewai import Crew, Process
from app.agents.factory import AgentFactory
from app.tasks.factory import TaskFactory
from app.core.privacy import PrivacyScrubber
from app.core.config import settings
from app.services.signal_processor import SignalProcessor
from app.services.fast_track_service import FastTrackService
from app.services.response_cleaner import ResponseCleaner
from typing import List, Dict, Any
import re
import logging

logger = logging.getLogger(__name__)


class CrewService:
    def __init__(self):
        self.agent_factory = AgentFactory()
        self.signal_processor = SignalProcessor()
        self.fast_track = FastTrackService()
        self.cleaner = ResponseCleaner()

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None, state: Dict[str, Any] = None, user_context: Any = None, user_id: str = None) -> Dict[str, Any]:
        from litellm import completion
        state = state or {}
        clean_msg = user_message.lower().strip().strip('?!.')
        
        logger.info(f"Kickoff chat request. User: {user_id}, Message: {user_message[:50]}...")
        
        import time
        start_time = time.time()
        
        # ── Phase 1: Fast-Track (Non-LLM) ────────────────────────────────────
        fast_response = self.fast_track.handle_immediate_responses(user_message, clean_msg, state, user_context, user_id)
        if fast_response:
            fast_response["usage"] = fast_response.get("usage", self._empty_usage())
            fast_response["usage"]["response_time"] = round(time.time() - start_time, 2)
            # Clean fast-track output to remove any leaked signals (e.g. TRACKING_INFO)
            fast_response["result"] = self.cleaner.clean_and_format(fast_response["result"], state.get("pii_mapping", {}))
            return fast_response

        # ── Phase 2: Privacy Pseudonymization ────────────────────────────────
        scrubbed_message, pii_mapping = PrivacyScrubber.pseudonymize_text(user_message)
        pii_mapping.update(state.get("pii_mapping", {}))
        state["pii_mapping"] = pii_mapping
        
        # Prepare User Context for LLM
        masked_name = PrivacyScrubber.mask_name(user_name)
        user_info = f"Customer Name: {masked_name}\n" if user_name else ""
        if user_id: user_info += f"Customer Internal ID: {user_id}\n"
        
        if user_context and getattr(user_context, 'is_authenticated', False):
            pii_mapping["[AUTH_EMAIL]"] = user_context.email
            user_info += "Customer Email: [AUTH_EMAIL]\nAUTHENTICATION STATUS: VERIFIED.\n"
        else:
            user_info += "AUTHENTICATION STATUS: GUEST. Ask for details if placing an order.\n"
        
        from app.core.privacy import PII_MAPPING
        PII_MAPPING.set(pii_mapping)

        # ── Phase 3: Heuristic & Static Routing ──────────────────────────────
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            resp = self.fast_track.get_greeting(user_name or "there")
            resp["usage"]["response_time"] = round(time.time() - start_time, 2)
            return resp

        # Explicit cancellation regex check (Fast-track ID detection)
        cancel_match = re.search(r"cancel\s+(?:this\s+)?order\s+([a-f0-9\-]{36})", clean_msg)
        if cancel_match:
            order_id = cancel_match.group(1)
            msg = f"We can assist with cancelling order {order_id}. Please reply 'yes' to confirm."
            return {"result": msg, "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}, "state_update": {"pending_confirmation": order_id}}

        # Explicit status/track regex check
        status_keywords = ["status", "track", "truck", "where", "info", "lookup"]
        if any(kw in clean_msg for kw in status_keywords) and re.search(r"([a-f0-9\-]{36})", clean_msg):
            logger.info("Direct regex match for status tracking with UUID.")
            order_id = re.search(r"([a-f0-9\-]{36})", clean_msg).group(1)
            resp = self.fast_track._handle_status_inquiry(user_context, user_id, state, order_id=order_id)
            if resp:
                resp["usage"]["response_time"] = round(time.time() - start_time, 2)
                # Clean fast-track output
                resp["result"] = self.cleaner.clean_and_format(resp["result"], state.get("pii_mapping", {}))
                return resp

        if len(clean_msg) < 2: 
            resp = self.fast_track.get_clarification_response()
            resp["usage"] = resp.get("usage", self._empty_usage())
            resp["usage"]["response_time"] = round(time.time() - start_time, 2)
            return resp
            
        if clean_msg in ["test", "bot", "anyone"]:
            return {"result": "I'm here and ready to help!", "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}}

        # ── Phase 4: Intent Routing (LiteLLM) ───────────────────────────────
        intent = self._route_intent(scrubbed_message)
        logger.info(f"Detected intent: {intent}")

        # Handle simple routing overrides
        if "INVALID" in intent:
            if len(user_message.split()) > 3:
                return {"result": "I can only assist with Luxe products and policies.", "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}}
            resp = self.fast_track.get_clarification_response()
            resp["usage"] = resp.get("usage", self._empty_usage())
            resp["usage"]["response_time"] = round(time.time() - start_time, 2)
            return resp

        if intent == "GREETING" and not any(state.get(k) for k in ["pending_order_summary", "pending_yes_no", "pending_confirmation"]):
            resp = self.fast_track.get_greeting(user_name or "there")
            resp["usage"]["response_time"] = round(time.time() - start_time, 2)
            return resp

        if (intent == "COMPLAINT" or "admin" in clean_msg) and len(user_message.split()) < 8:
            return {"result": "I'm sorry to hear that. Could you please provide details of your complaint?", "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}}

        # ── Context Correction ──────────────────────────────────────────────
        # If user is in a purchase flow but asks for something else, reset summary
        if intent == "PURCHASE" and state.get("pending_order_summary"):
            summary = state.get("pending_order_summary")
            summary_name = (summary.get("product_name") or summary.get("name") or "").lower()
            # If message mentions a common category or item that isn't the pending one
            categories = ["laptop", "mat", "chair", "shoes", "shirt", "watch", "camera", "phone"]
            if any(cat in clean_msg and cat not in summary_name for cat in categories):
                logger.info(f"Context shift detected (from {summary_name} to {clean_msg}). Resetting summary.")
                state["pending_order_summary"] = None

        # ── Phase 5: CrewAI Execution ───────────────────────────────────────
        agent = self.agent_factory.create_unified_specialist_agent()
        mission = self._get_mission(intent, scrubbed_message, state)
        
        task = TaskFactory.create_order_task(
            agent=agent,
            user_message=scrubbed_message,
            history_str="\n".join(history[-6:]) if history else "No previous history.",
            user_info=user_info,
            mission=mission
        )

        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=True)
        crew_output = crew.kickoff()
        
        # ── Phase 6: Signal Extraction & Response Cleaning ──────────────────
        # Check for signals first (they take precedence)
        signal_result = self.signal_processor.process_all_signals(crew_output, pii_mapping)
        if signal_result:
            signal_result["usage"] = signal_result.get("usage", self._empty_usage())
            signal_result["usage"]["response_time"] = round(time.time() - start_time, 2)
            return signal_result

        # Final message processing
        final_message = self.cleaner.clean_and_format(str(crew_output), pii_mapping)
        usage = self.signal_processor._get_usage(crew_output)
        usage["response_time"] = round(time.time() - start_time, 2)

        return {"result": final_message, "usage": usage}

    def _route_intent(self, message: str) -> str:
        from litellm import completion
        prompt = (
            "You are a Traffic Controller. Categorize the user message into exactly ONE of these categories:\n"
            "GREETING: hello, hi, etc.\n"
            "PURCHASE: search, browse, or buy products. Use this ONLY if they want to see/buy items like laptops, watches, etc.\n"
            "MANAGEMENT: track order, check status, or cancel order.\n"
            "KNOWLEDGE: questions about payment methods, return policy, shipping info, store hours, or general company help.\n"
            "COMPLAINT: reporting a problem.\n"
            "INVALID: off-topic (cars, medical, etc).\n\n"
            "Output ONLY the category name in all caps."
        )
        try:
            resp = completion(model=settings.WORKER_MODEL, messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}], max_tokens=10, temperature=0.0)
            intent = str(resp.choices[0].message.content).strip().upper()
            return re.sub(r'[^A-Z]', ' ', intent).split()[0] if intent else "COMPLEX"
        except Exception as e:
            logger.warning(f"Router failed: {e}")
            return "COMPLEX"

    def _get_mission(self, intent: str, message: str, state: Dict[str, Any]) -> str:
        is_purchase = intent == "PURCHASE" or any(w in message.lower() for w in ["buy", "order", "purchase", "search"])
        is_management = intent == "MANAGEMENT" or any(w in message.lower() for w in ["cancel", "track", "status"])
        
        if is_purchase and not is_management:
            if state.get("pending_order_summary"):
                summary = state.get("pending_order_summary")
                p_name = summary.get("product_name") or summary.get("name") or "the product"
                return (
                    f"The user has seen the product '{p_name}'. "
                    "1. If they confirm (yes/buy/proceed), output 'CHECKOUT_REQUIRED' with details. "
                    "2. If they ask about a DIFFERENT product or seem to have changed their mind, DISCARD the pending summary and use 'search_products' to start over. "
                    "3. Otherwise, answer their questions about the current product."
                )
            if state.get("pending_checkout"):
                return "The user is in the checkout form. Answer any questions they have about the process or the product."
            
            # Explicitly forbid auto-choosing
            return (
                "Help the user find a product. Use 'search_products'. "
                "CRITICAL: If multiple products are found, ALWAYS output 'PRODUCT_LIST: [...]' signal. "
                "NEVER choose a product for the user. NEVER output 'PLACE_ORDER_SUMMARY' unless the user has explicitly named a specific product they want to buy."
            )
        
        if is_management:
            return (
                "1. Use get_order_details to track/check order status. "
                "2. ONLY if the user explicitly and clearly asked to CANCEL, verify eligibility and then output the CONFIRMATION_REQUIRED signal. "
                "3. If they provide an order ID without 'cancel', assume they want to TRACK it. NEVER assume cancellation intent for typos like 'truck'."
            )
        if intent == "COMPLAINT" or "admin" in message.lower() or "court" in message.lower():
            return (
                "The user is filing a complaint or sending a message to administration. "
                "1. Use 'submit_complaint' to record their message. "
                "2. Provide the 'CMP-' Reference ID to the user. "
                "3. DO NOT look for or track orders unless the user specifically asks to track a specific 'ORD-' Order ID within the complaint."
            )

        return "Handle knowledge/FAQ, search, or complaints using tools. Write warm response. Do not assume any order context unless provided."

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        import time
        start = time.time()
        resp = self.fast_track.get_greeting(first_name)
        resp["usage"] = resp.get("usage", self._empty_usage())
        resp["usage"]["response_time"] = round(time.time() - start, 2)
        return resp

    def _empty_usage(self) -> Dict[str, int]:
        return {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}
