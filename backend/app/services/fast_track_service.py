import logging
import re
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
            from app.tools.order_tools import cancel_order as cancel_order_fn
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
        if pending_summary and clean_msg:
            # Affirmative keywords
            affirmations = ["yes", "y", "confirm", "sure", "buy", "proceed", "do it", "i want", "i want to buy", "checkout", "place order"]
            
            # Check if exactly affirmative or starts with affirmative + short
            is_affirmative = clean_msg in affirmations or any(clean_msg.startswith(f"{a} ") for a in affirmations)
            
            # If it's affirmative, double check for topic mismatch
            if is_affirmative:
                summary_name = (pending_summary.get("product_name") or pending_summary.get("name") or "").lower()
                # If they say "i want to buy laptop" but the summary is a yoga mat, it's NOT a confirmation
                categories = ["laptop", "mat", "chair", "shoes", "shirt", "watch", "camera", "phone"]
                mismatch = any(cat in clean_msg and cat not in summary_name for cat in categories)
                
                if not mismatch:
                    return self._handle_summary_confirmation(pending_summary)

        # 4. Abort Confirmation
        if (pending_order or state.get("pending_checkout") or state.get("pending_yes_no") or pending_summary) and clean_msg in ["no", "n", "cancel", "stop", "nevermind"]:
            logger.info(f"User aborted pending action.")
            return {
                "result": "No problem. I've cancelled that action. What else can I help you with?", 
                "usage": self._empty_usage(), 
                "state_update": {"pending_confirmation": None, "pending_order_summary": None, "pending_checkout": None, "pending_yes_no": None}
            }

        # 5. Last Order or Specific Order ID Fast-Track
        # Check for ID patterns (ORD-uuid or CMP-uuid or raw uuid)
        uuid_match = re.search(r"((?:ORD-|CMP-)[a-f0-9\-]{36}|[a-f0-9\-]{36})", clean_msg, re.IGNORECASE)
        email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", clean_msg)

        # Use regex for whole-word matching to avoid false positives (e.g. 'info' in 'administration')
        status_regex = r"\b(status|track|truck|where is|where's|update on|check|lookup|info)\b"
        order_regex = r"\b(last order|my order|recent order|this order|the order)\b"
        cancel_regex = r"\b(cancel|stop|abort|delete|refund|return)\b"
        
        has_status_kw = re.search(status_regex, clean_msg, re.IGNORECASE)
        has_order_kw = re.search(order_regex, clean_msg, re.IGNORECASE)
        has_cancel_kw = re.search(cancel_regex, clean_msg, re.IGNORECASE)
        
        # Case A: UUID provided or BOTH status and order keywords present
        # BUT: Do not fast-track if they are asking to cancel or other specific actions
        if (uuid_match or (has_status_kw and has_order_kw)) and not has_cancel_kw:
            order_id = uuid_match.group(1) if uuid_match else None
            return self._handle_status_inquiry(user_context, user_id, state, order_id=order_id)
            
        # Case B: Email provided for a pending order lookup
        pending_order_id = state.get("pending_order_id")
        if pending_order_id and email_match:
            email = email_match.group(0)
            logger.info(f"Fast-tracking order lookup with email: {email} for order: {pending_order_id}")
            return self._handle_status_inquiry(user_context, user_id, state, order_id=pending_order_id, provided_email=email)

        # 6. FAQ Fast-Track (Local Embeddings)
        faq_keywords = ["payment", "methods", "pay", "return", "shipping", "hours", "contact", "support", "refund", "policy"]
        if any(kw in clean_msg for kw in faq_keywords) and len(clean_msg.split()) < 15:
            return self.handle_faq_fast_track(user_message)

        # 7. Complaint Fast-Track
        # Check for the specific prefix sent by the ComplaintModal
        complaint_prefix = "I want to send a message to the administration team: "
        if user_message.startswith(complaint_prefix):
            complaint_text = user_message[len(complaint_prefix):].strip()
            if complaint_text:
                from app.tools.support_tools import submit_complaint as submit_complaint_fn
                is_auth = user_context and getattr(user_context, 'is_authenticated', False)
                
                # Get name and email from context
                customer_name = getattr(user_context, 'full_name', None) if is_auth else None
                customer_email = getattr(user_context, 'email', None) if is_auth else None
                
                logger.info(f"Fast-tracking complaint submission: {complaint_text[:50]}...")
                result = submit_complaint_fn(
                    subject="Customer Complaint",
                    message=complaint_text,
                    customer_name=customer_name,
                    customer_email=customer_email,
                    user_id=user_id
                )
                return {
                    "result": result,
                    "usage": self._empty_usage()
                }

        return None

    def handle_faq_fast_track(self, question: str) -> Optional[Dict[str, Any]]:
        """Provides a quick RAG-based response for common FAQ queries."""
        try:
            from app.tools.faq_tools import get_company_faq as get_company_faq_fn
            logger.info(f"Attempting FAQ fast-track for: {question}")
            answer = get_company_faq_fn(question)
            
            if "I couldn't find any specific information" in answer or "trouble accessing" in answer:
                return None
                
            # Clean up the answer format for direct display
            # RAG returns "--- KNOWLEDGE SOURCE 1 --- \n..."
            clean_answer = re.sub(r"--- KNOWLEDGE SOURCE \d+ ---", "", answer).strip()
            # If multiple sources, take the first one or combine neatly
            clean_answer = clean_answer.split("Question:")[1].split("Answer:")[1].strip() if "Answer:" in clean_answer else clean_answer
            
            return {
                "result": clean_answer,
                "usage": self._empty_usage()
            }
        except Exception as e:
            logger.warning(f"FAQ fast-track failed: {e}")
            return None

    def _handle_status_inquiry(self, user_context, user_id, state, order_id: str = None, provided_email: str = None) -> Optional[Dict[str, Any]]:
        is_auth = False
        if user_context:
            is_auth = getattr(user_context, 'is_authenticated', False) if not isinstance(user_context, dict) else user_context.get('is_authenticated', False)
        
        # Fallback to LLM only if we have NO order_id AND no auth AND no provided email
        if not is_auth and not (user_id and user_id.startswith("user_")) and not order_id and not provided_email:
            return None
            
        from app.tools.order_tools import get_order_details as get_order_details_fn
        from app.core.privacy import PII_MAPPING
        
        pii_mapping = state.get("pii_mapping", {})
        auth_email = None
        if is_auth:
            auth_email = getattr(user_context, 'email', None) if not isinstance(user_context, dict) else user_context.get('email')
            if auth_email:
                pii_mapping["[AUTH_EMAIL]"] = auth_email
        
        PII_MAPPING.set(pii_mapping)
        
        # Call the tool function directly
        # Use provided_email if we have it, otherwise fallback to [AUTH_EMAIL]
        result = get_order_details_fn(
            order_id=order_id, 
            customer_email=provided_email if provided_email else ("[AUTH_EMAIL]" if auth_email else None),
            user_id=user_id if (user_id and user_id.startswith("user_")) else None
        )
        
        if "security reasons" in result:
            return {
                "result": f"I found order `{order_id}`, but for security, could you please provide the email address associated with it?",
                "usage": self._empty_usage(),
                "state_update": {"pending_order_id": order_id}
            }
            
        if "Order not found" in result:
            return {
                "result": "I couldn't find that order. Please double-check the Order ID or try searching with your email address.",
                "usage": self._empty_usage()
            }
        
        if "Error" in result:
            return None # Fallback to LLM for complex errors
            
        # Parse the result string (it's a stringified dict)
        try:
            import ast
            order_data = ast.literal_eval(result)
            status = order_data.get('status', 'Unknown').upper()
            order_id = order_data.get('id', 'N/A')
            created_at = order_data.get('createdAt', '')
            
            # Extract date if possible
            date_str = ""
            if created_at and "T" in str(created_at):
                date_str = f" placed on {str(created_at).split('T')[0]}"

            msg = f"Your most recent order (#{order_id}){date_str} is currently **{status}**."
            
            state_update = {
                "pending_order_id": None,
                "pending_tracking_data": None
            }
            
            if status in ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED", "DELIVERED"]:
                if status == "PENDING":
                    msg += " We are preparing it for processing."
                elif status == "PROCESSING":
                    msg += " We are preparing it for shipment."
                elif status == "SHIPPED":
                    msg += " It's on its way to you!"
                else:
                    msg += " It has been successfully delivered!"
                    
                # Inject Mock Tracking Data
                try:
                    from app.services.tracking_service import MockTrackingService
                    tracking_data = MockTrackingService.get_mock_tracking(order_data)
                    if tracking_data.get("active"):
                        import json
                        msg += f"\n\nTRACKING_INFO: {json.dumps(tracking_data)}"
                        state_update["pending_tracking_data"] = tracking_data
                except Exception as te:
                    logger.warning(f"Failed to generate mock tracking: {te}")
            
            return {
                "result": msg,
                "usage": self._empty_usage(),
                "state_update": state_update
            }
        except Exception as e:
            logger.warning(f"Failed to parse fast-track order result: {e}")
            return None

    def _handle_system_process_order(self, state, user_context, user_id) -> Dict[str, Any]:
        from app.tools.order_tools import place_order as place_order_fn
        from app.tools.base import detokenize_val
        details = state.get("pending_order_details")
        if not details:
            return {
                "result": "I'm sorry, I couldn't find the order details. Please try again.",
                "usage": self._empty_usage(),
                "state_update": {"pending_checkout": None}
            }
        
        # Check authentication status
        is_auth = False
        if user_context:
            if isinstance(user_context, dict):
                is_auth = user_context.get('is_authenticated', False)
            else:
                is_auth = getattr(user_context, 'is_authenticated', False)
        
        # If user_id is present and looks like a real Clerk ID, treat as auth fallback
        if not is_auth and user_id and user_id.startswith("user_"):
            is_auth = True
        
        from app.core.privacy import PII_MAPPING
        pii_mapping = state.get("pii_mapping", {})
        PII_MAPPING.set(pii_mapping)
        
        # Robust email detection
        email = None
        if is_auth:
            email = getattr(user_context, 'email', None) if not isinstance(user_context, dict) else user_context.get('email')
        
        if not email:
            email = details.get("customer_email")
            
        if not email:
            for val in pii_mapping.values():
                if isinstance(val, str) and "@" in val:
                    email = val
                    break
        
        logger.info(f"System Order Process - Auth: {is_auth}, Email: {email}")
        
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
            "state_update": {"pending_checkout": None}
        }

    def _handle_summary_confirmation(self, pending_summary) -> Dict[str, Any]:
        if isinstance(pending_summary, dict):
            product_name = pending_summary.get("product_name") or pending_summary.get("name") or "Product"
            price = pending_summary.get("price") or 0.0
            imageUrl = pending_summary.get("imageUrl")
            details = pending_summary.get("details")
            items = [{"product_name": product_name, "quantity": 1, "price": price, "imageUrl": imageUrl, "details": details, "estimated_delivery": "Arrives by Friday, May 8"}]
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
