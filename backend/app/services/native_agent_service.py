import os
import json
import time
import logging
import re
import google.generativeai as genai
from typing import List, Dict, Any
from app.schemas.response import ChatResponseSchema
from app.tools.product_tools import search_products
from app.tools.order_tools import get_order_details, cancel_order, place_order
from app.tools.support_tools import submit_complaint
from app.tools.faq_tools import get_company_faq
from app.core.config import settings
from app.core.privacy import PrivacyScrubber, PII_MAPPING
from app.services.fast_track_service import FastTrackService
from app.services.response_cleaner import ResponseCleaner

logger = logging.getLogger(__name__)

class NativeAgentService:
    def __init__(self):
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.fast_track = FastTrackService()
        self.cleaner = ResponseCleaner()
        
        # Register the raw python functions as tools
        self.tools = [
            search_products,
            get_order_details,
            cancel_order,
            place_order,
            submit_complaint,
            get_company_faq
        ]
        
        self.system_instruction = """
        You are the Unified Luxe Specialist, a premier AI assistant for Luxe.
        Your goal is to handle customer inquiries with absolute professionalism, a warm tone, and extreme efficiency.
        You have access to tools for searching products, managing orders, and answering FAQs.
        
        CRITICAL RULES:
        1. Always be polite, warm, and concise.
        2. If you need to look up an order, use get_order_details.
        3. If you need to search products, use search_products.
        4. If a user asks a policy question, use get_company_faq.
        5. When you have enough information, synthesize a final response. 
        6. Do NOT expose raw tool JSON outputs to the user.
        7. Extract relevant machine-readable signals for the UI into `ui_signals` (e.g., TRACKING_INFO, PRODUCT_LIST, CHECKOUT_REQUIRED).
        8. If you retrieve order details with tracking, place the parsed tracking info into the `payload` dict.
        """
        
        # Instantiate the model with the defined schema
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            tools=self.tools,
            system_instruction=self.system_instruction,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=ChatResponseSchema
            )
        )

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None, state: Dict[str, Any] = None, user_context: Any = None, user_id: str = None) -> Dict[str, Any]:
        """Drop-in replacement for CrewService.kickoff_chat"""
        state = state or {}
        clean_msg = user_message.lower().strip().strip('?!.')
        start_time = time.time()
        
        logger.info(f"NativeAgentService processing chat. User: {user_id}")
        
        # Phase 1: Fast-Track (Non-LLM)
        fast_response = self.fast_track.handle_immediate_responses(user_message, clean_msg, state, user_context, user_id)
        if fast_response:
            fast_response["usage"] = {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}
            fast_response["result"] = self.cleaner.clean_and_format(fast_response["result"], state.get("pii_mapping", {}))
            return fast_response

        # Phase 2: Privacy Pseudonymization
        scrubbed_message, pii_mapping = PrivacyScrubber.pseudonymize_text(user_message)
        pii_mapping.update(state.get("pii_mapping", {}))
        state["pii_mapping"] = pii_mapping
        
        if user_context and getattr(user_context, 'is_authenticated', False):
            pii_mapping["[AUTH_EMAIL]"] = user_context.email
            
        PII_MAPPING.set(pii_mapping)

        # Phase 3: Heuristics & Static Routing (retained from CrewService)
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            resp = self.fast_track.get_greeting(user_name or "there")
            resp["usage"]["response_time"] = round(time.time() - start_time, 2)
            return resp

        cancel_match = re.search(r"cancel\s+(?:this\s+)?order\s+([a-f0-9\-]{36})", clean_msg)
        if cancel_match:
            order_id = cancel_match.group(1)
            msg = f"We can assist with cancelling order {order_id}. Please reply 'yes' to confirm."
            return {"result": msg, "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}, "state_update": {"pending_confirmation": order_id}}

        status_keywords = ["status", "track", "truck", "where", "info", "lookup"]
        if any(kw in clean_msg for kw in status_keywords) and re.search(r"([a-f0-9\-]{36})", clean_msg):
            order_id = re.search(r"([a-f0-9\-]{36})", clean_msg).group(1)
            resp = self.fast_track._handle_status_inquiry(user_context, user_id, state, order_id=order_id)
            if resp:
                resp["usage"]["response_time"] = round(time.time() - start_time, 2)
                resp["result"] = self.cleaner.clean_and_format(resp["result"], state.get("pii_mapping", {}))
                return resp

        if len(clean_msg) < 2: 
            resp = self.fast_track.get_clarification_response()
            resp["usage"] = {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start_time, 2)}
            return resp

        # Initialize chat session history
        formatted_history = []
        if history:
            for msg in history:
                if msg.startswith("User:"):
                    formatted_history.append({"role": "user", "parts": [msg[5:]]})
                elif msg.startswith("Assistant:"):
                    formatted_history.append({"role": "model", "parts": [msg[10:]]})
                
        chat_session = self.model.start_chat(history=formatted_history)
        
        try:
            response = chat_session.send_message(scrubbed_message)
            
            for _ in range(5):
                if not response.function_calls:
                    break
                    
                tool_responses = []
                for function_call in response.function_calls:
                    tool_name = function_call.name
                    tool_args = {k: v for k, v in function_call.args.items()}
                    logger.info(f"Agent invoking tool: {tool_name} with args: {tool_args}")
                    
                    tool_result = ""
                    try:
                        if tool_name == "search_products":
                            tool_result = search_products(**tool_args)
                        elif tool_name == "get_order_details":
                            tool_result = get_order_details(**tool_args)
                        elif tool_name == "cancel_order":
                            tool_result = cancel_order(**tool_args)
                        elif tool_name == "place_order":
                            tool_result = place_order(**tool_args)
                        elif tool_name == "submit_complaint":
                            tool_result = submit_complaint(**tool_args)
                        elif tool_name == "get_company_faq":
                            tool_result = get_company_faq(**tool_args)
                        else:
                            tool_result = f"Error: Unknown tool '{tool_name}'"
                    except Exception as e:
                        logger.error(f"Error executing {tool_name}: {e}")
                        tool_result = f"Tool execution failed: {str(e)}"
                    
                    tool_responses.append({
                        "function_response": {
                            "name": tool_name,
                            "response": {"result": tool_result}
                        }
                    })
                
                response = chat_session.send_message(tool_responses)
            
            raw_text = response.text
            parsed_json = json.loads(raw_text)
            
            # Map structured output to old CrewService format
            message_text = parsed_json.get("message", "I'm sorry, I encountered an error.")
            ui_signals = parsed_json.get("ui_signals", [])
            payload = parsed_json.get("payload", {})
            
            state_update = {}
            if payload:
                # Merge payload into state update depending on what it is
                if "TRACKING_INFO" in ui_signals:
                    state_update["pending_tracking_data"] = payload
                else:
                    state_update.update(payload)
                    
            if ui_signals:
                # Append signals as a serialized string so frontend can catch them (legacy compatibility)
                message_text += f"\n[SIGNALS: {','.join(ui_signals)}]"

            final_message = self.cleaner.clean_and_format(message_text, pii_mapping)
            
            usage_data = response.usage_metadata if hasattr(response, 'usage_metadata') else None
            usage_dict = {
                "prompt_tokens": usage_data.prompt_token_count if usage_data else 0,
                "completion_tokens": usage_data.candidates_token_count if usage_data else 0,
                "total_tokens": usage_data.total_token_count if usage_data else 0,
                "response_time": round(time.time() - start_time, 2)
            }
            
            return {
                "result": final_message,
                "usage": usage_dict,
                "state_update": state_update
            }

        except Exception as e:
            logger.error(f"NativeAgentService Error: {e}")
            return {"result": "I am experiencing technical difficulties. Please try again later.", "usage": {"response_time": round(time.time() - start_time, 2)}}

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        import time
        start = time.time()
        resp = self.fast_track.get_greeting(first_name)
        resp["usage"] = {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0, "response_time": round(time.time() - start, 2)}
        return resp
