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
        
        # ── Phase 1: Fast-Track (Non-LLM) ────────────────────────────────────
        fast_response = self.fast_track.handle_immediate_responses(user_message, clean_msg, state, user_context, user_id)
        if fast_response:
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
            return self.fast_track.get_greeting(user_name or "there")

        # Explicit cancellation regex check (Fast-track ID detection)
        cancel_match = re.search(r"cancel\s+(?:this\s+)?order\s+([a-f0-9\-]{36})", clean_msg)
        if cancel_match:
            order_id = cancel_match.group(1)
            msg = f"We can assist with cancelling order {order_id}. Please reply 'yes' to confirm."
            return {"result": msg, "usage": self._empty_usage(), "state_update": {"pending_confirmation": order_id}}

        if len(clean_msg) < 2: return self.fast_track.get_clarification_response()
        if clean_msg in ["test", "bot", "anyone"]:
            return {"result": "I'm here and ready to help!", "usage": self._empty_usage()}

        # ── Phase 4: Intent Routing (LiteLLM) ───────────────────────────────
        intent = self._route_intent(scrubbed_message)
        logger.info(f"Detected intent: {intent}")

        # Handle simple routing overrides
        if "INVALID" in intent:
            if len(user_message.split()) > 3:
                return {"result": "I can only assist with Luxe products and policies.", "usage": self._empty_usage()}
            return self.fast_track.get_clarification_response()

        if intent == "GREETING" and not any(state.get(k) for k in ["pending_order_summary", "pending_yes_no", "pending_confirmation"]):
            return self.fast_track.get_greeting(user_name or "there")

        if (intent == "COMPLAINT" or "admin" in clean_msg) and len(user_message.split()) < 8:
            return {"result": "I'm sorry to hear that. Could you please provide details of your complaint?", "usage": self._empty_usage()}

        # ── Phase 5: CrewAI Execution ───────────────────────────────────────
        agent = self.agent_factory.create_order_agent() if intent in ["PURCHASE", "MANAGEMENT"] else self.agent_factory.create_unified_specialist_agent()
        mission = self._get_mission(intent, scrubbed_message)
        
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
            return signal_result

        # Final message processing
        final_message = self.cleaner.clean_and_format(str(crew_output), pii_mapping)
        usage = self.signal_processor._get_usage(crew_output)

        return {"result": final_message, "usage": usage}

    def _route_intent(self, message: str) -> str:
        from litellm import completion
        prompt = (
            "Categorize the message: GREETING, PURCHASE, MANAGEMENT, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID.\n"
            "PURCHASE: buy/search. MANAGEMENT: track/cancel orders. INVALID: off-topic.\n"
            "Output ONLY the category name."
        )
        try:
            resp = completion(model=settings.WORKER_MODEL, messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}], max_tokens=10, temperature=0.0)
            intent = str(resp.choices[0].message.content).strip().upper()
            return re.sub(r'[^A-Z]', ' ', intent).split()[0] if intent else "COMPLEX"
        except Exception as e:
            logger.warning(f"Router failed: {e}")
            return "COMPLEX"

    def _get_mission(self, intent: str, message: str) -> str:
        is_purchase = intent == "PURCHASE" or any(w in message.lower() for w in ["buy", "order", "purchase", "search"])
        is_management = intent == "MANAGEMENT" or any(w in message.lower() for w in ["cancel", "track", "status"])
        
        if is_purchase and not is_management:
            return "1. Search products. 2. Output PLACE_ORDER_SUMMARY JSON for choice. 3. Output CHECKOUT_REQUIRED JSON after confirm."
        if is_management:
            return "1. Track/check status. 2. If cancelling, get details first. 3. Output CONFIRMATION_REQUIRED: [ID] if eligible."
        return "Handle knowledge/FAQ, search, or complaints using tools. Write warm response."

    def _empty_usage(self) -> Dict[str, int]:
        return {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}
