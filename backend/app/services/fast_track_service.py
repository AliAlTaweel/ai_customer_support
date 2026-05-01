import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class FastTrackService:
    def handle_immediate_responses(self, user_message: str, clean_msg: str, state: Dict[str, Any], user_context: Any = None, user_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Handles non-LLM immediate responses like confirmations and aborts.
        Returns a result dict if handled, otherwise None.
        """
        # 1. Order Cancellation Confirmation
        pending_order = state.get("pending_confirmation")
        if pending_order and clean_msg in ["yes", "y", "confirm", "sure", "do it"]:
            from app.tools.order_tools import cancel_order_fn
            is_auth = user_context and getattr(user_context, 'is_authenticated', False)
            
            from app.core.privacy import PII_MAPPING
            pii_mapping = state.get("pii_mapping", {})
            if is_auth:
                pii_mapping["[AUTH_EMAIL]"] = user_context.email
            PII_MAPPING.set(pii_mapping)
            
            logger.info(f"Fast-tracking order cancellation: {pending_order}")
            result = cancel_order_fn(
                pending_order, 
                customer_email="[AUTH_EMAIL]" if is_auth else None,
                user_id=user_id if is_auth else None
            )
            return {
                "result": result, 
                "usage": self._empty_usage(), 
                "state_update": {"pending_confirmation": None}
            }
        
        # 2. System Process Order (from form)
        if user_message == "SYSTEM_PROCESS_ORDER":
            return self._handle_system_process_order(state, user_context, user_id)
        
        # 3. Purchase Summary Confirmation
        pending_summary = state.get("pending_order_summary")
        if pending_summary and clean_msg in ["yes", "y", "confirm", "sure", "buy", "proceed", "i want", "i want to buy"]:
            return self._handle_summary_confirmation(pending_summary)

        # 4. Abort Confirmation
        if (pending_order or state.get("pending_checkout") or state.get("pending_yes_no") or pending_summary) and clean_msg in ["no", "n", "cancel", "stop", "nevermind"]:
            logger.info(f"User aborted pending action.")
            return {
                "result": "No problem. I've cancelled that action. What else can I help you with?", 
                "usage": self._empty_usage(), 
                "state_update": {"pending_confirmation": None, "pending_order_details": None, "pending_order_summary": None, "pending_checkout": None, "pending_yes_no": None}
            }

        return None

    def _handle_system_process_order(self, state, user_context, user_id) -> Dict[str, Any]:
        from app.tools.order_tools import place_order_fn
        from app.tools.base import detokenize_val
        details = state.get("pending_order_details")
        if not details:
            return {
                "result": "I'm sorry, I couldn't find the order details. Please try again.",
                "usage": self._empty_usage(),
                "state_update": {"pending_checkout": None}
            }
        
        is_auth = user_context and getattr(user_context, 'is_authenticated', False)
        from app.core.privacy import PII_MAPPING
        pii_mapping = state.get("pii_mapping", {})
        PII_MAPPING.set(pii_mapping)
        
        email = user_context.email if is_auth else details.get("customer_email")
        if not email:
            for val in pii_mapping.values():
                if "@" in str(val):
                    email = val
                    break
        
        if not email:
            return {
                "result": "I'm sorry, but I need your email address to place the order. Could you please provide it?",
                "usage": self._empty_usage(),
                "state_update": {"pending_checkout": details}
            }

        items = details.get("items", [])
        for item in items:
            item['product_name'] = detokenize_val(item.get('product_name'))

        result = place_order_fn(
            customer_email=email,
            customer_name=details.get("customer_name"),
            items=items,
            shipping_address=details.get("shipping_address"),
            payment_method=details.get("payment_method", "Card"),
            user_id=user_id if is_auth else None
        )
        
        return {
            "result": result,
            "usage": self._empty_usage(),
            "state_update": {"pending_checkout": None, "pending_order_details": None}
        }

    def _handle_summary_confirmation(self, pending_summary) -> Dict[str, Any]:
        if isinstance(pending_summary, dict):
            product_name = pending_summary.get("product_name") or pending_summary.get("name") or "Product"
            price = pending_summary.get("price") or 0.0
            imageUrl = pending_summary.get("imageUrl")
            details = pending_summary.get("details")
            items = [{"product_name": product_name, "quantity": 1, "price": price, "imageUrl": imageUrl, "details": details}]
        else:
            items = [{"product_name": str(pending_summary), "quantity": 1, "price": 0.0}]
        
        return {
            "result": "I've prepared the order details for you. Please fill out the secure checkout form below to complete your purchase.",
            "usage": self._empty_usage(),
            "state_update": {"pending_order_summary": None, "pending_checkout": {"items": items}}
        }

    def _empty_usage(self) -> Dict[str, Any]:
        return {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        greeting = (
            f"Hello {first_name}, welcome to Luxe. As your dedicated assistant, I can help you with "
            "everything from product discovery and tracking your order to clarifying our company policies. "
            "Is there anything I can assist you with today?"
        )
        return {"result": greeting, "usage": self._empty_usage()}

    def get_clarification_response(self) -> Dict[str, Any]:
        return {
            "result": "I didn't quite catch that. Could you please provide a bit more detail so I can assist you better?",
            "usage": self._empty_usage()
        }
