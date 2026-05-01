import re
import json
import ast
import logging
from typing import Dict, Any, Optional
from app.core.privacy import PrivacyScrubber

logger = logging.getLogger(__name__)

class SignalProcessor:
    @staticmethod
    def extract_signal(signal_name: str, source: str) -> Optional[str]:
        """
        Robustly extracts a signal from the AI output using regex.
        Supports markdown code blocks and raw JSON/strings.
        """
        # Pattern 1: SIGNAL: ```json { ... } ```
        pattern_markdown = rf"{signal_name}:?\s*```(?:json)?\s*(\{{.*?\}})\s*```"
        match_md = re.search(pattern_markdown, source, re.IGNORECASE | re.DOTALL)
        if match_md:
            return match_md.group(1).strip()
        
        # Pattern 2: SIGNAL: { ... } (Raw JSON)
        pattern_raw_json = rf"{signal_name}:?\s*(\{{.*?\}})"
        match_raw = re.search(pattern_raw_json, source, re.IGNORECASE | re.DOTALL)
        if match_raw:
            return match_raw.group(1).strip()

        # Pattern 3: Fallback for non-JSON signals (like ID strings)
        pattern_fallback = rf"{signal_name}:?\s*([^\n`]*)"
        match_fb = re.search(pattern_fallback, source, re.IGNORECASE)
        if match_fb:
            return match_fb.group(1).strip()
        
        return None

    def process_all_signals(self, crew_output: Any, pii_mapping: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Analyzes the full crew output for known signals and returns a result dict if found.
        """
        final_message = str(crew_output).strip()
        raw_full_output = str(crew_output.raw) if hasattr(crew_output, "raw") else final_message
        
        # Check specialist task output specifically for signals
        specialist_output = ""
        if hasattr(crew_output, "tasks_output") and crew_output.tasks_output:
            for task_out in crew_output.tasks_output:
                t_raw = str(task_out.raw)
                if any(s in t_raw for s in ["PLACE_ORDER_SUMMARY:", "CONFIRMATION_REQUIRED:", "YES_NO_REQUIRED:", "CHECKOUT_REQUIRED:"]):
                    specialist_output = t_raw
                    break
                if not specialist_output:
                    specialist_output = t_raw
        
        signal_source = raw_full_output + "\n" + specialist_output
        usage = self._get_usage(crew_output)

        # 1. Order Cancellation Fast-Path
        cancel_id = self.extract_signal("CONFIRMATION_REQUIRED", signal_source)
        if cancel_id:
            order_id = cancel_id.split()[0].strip('.,![]{}')
            order_id = PrivacyScrubber.detokenize(order_id, pii_mapping)
            final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
            return {"result": final_message, "usage": usage, "state_update": {"pending_confirmation": order_id}}

        # 2. Generic Yes/No Confirmation Fast-Path
        yes_no_content = self.extract_signal("YES_NO_REQUIRED", signal_source)
        if yes_no_content:
            question = yes_no_content
            for s in ["PLACE_ORDER_SUMMARY", "CHECKOUT_REQUIRED", "CONFIRMATION_REQUIRED"]:
                question = re.split(rf"{s}:?", question, flags=re.IGNORECASE)[0].strip()
            return {"result": question, "usage": usage, "state_update": {"pending_yes_no": question}}

        # 3. Order Summary Confirmation Fast-Path
        summary_raw = self.extract_signal("PLACE_ORDER_SUMMARY", signal_source)
        if summary_raw:
            for s in ["CHECKOUT_REQUIRED", "YES_NO_REQUIRED", "CONFIRMATION_REQUIRED"]:
                summary_raw = re.split(rf"{s}:?", summary_raw, flags=re.IGNORECASE)[0].strip()
            
            summary_data = self._parse_json_safely(summary_raw)
            if isinstance(summary_data, dict):
                for key in ["product_name", "details"]:
                    if key in summary_data and isinstance(summary_data[key], str):
                        summary_data[key] = PrivacyScrubber.detokenize(summary_data[key], pii_mapping)
            else:
                summary_data = PrivacyScrubber.detokenize(str(summary_data), pii_mapping)

            return {
                "result": "Please confirm the product details below.", 
                "usage": usage, 
                "state_update": {"pending_order_summary": summary_data}
            }

        # 4. Order Checkout Fast-Path
        checkout_raw = self.extract_signal("CHECKOUT_REQUIRED", signal_source)
        if checkout_raw:
            checkout_data = self._parse_checkout_json(checkout_raw)
            if checkout_data:
                if "items" in checkout_data and isinstance(checkout_data["items"], list):
                    for item in checkout_data["items"]:
                        for key in ["product_name", "details"]:
                            if key in item and isinstance(item[key], str):
                                item[key] = PrivacyScrubber.detokenize(item[key], pii_mapping)

                return {
                    "result": "I've prepared the order details for you. Please fill out the secure checkout form below to complete your purchase.",
                    "usage": usage,
                    "state_update": {"pending_checkout": checkout_data}
                }

        return None

    def _get_usage(self, crew_output: Any) -> Dict[str, int]:
        usage = {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "successful_requests": 0}
        if hasattr(crew_output, "token_usage"):
            usage = {
                "total_tokens": getattr(crew_output.token_usage, "total_tokens", 0),
                "prompt_tokens": getattr(crew_output.token_usage, "prompt_tokens", 0),
                "completion_tokens": getattr(crew_output.token_usage, "completion_tokens", 0),
                "successful_requests": getattr(crew_output.token_usage, "successful_requests", 1)
            }
        return usage

    def _parse_json_safely(self, raw: str) -> Any:
        try:
            match = re.search(r'(\{.*\})', raw, re.DOTALL)
            if match:
                json_str = match.group(1)
                for i in range(len(json_str), 0, -1):
                    if json_str[i-1] == '}':
                        try:
                            return json.loads(json_str[:i])
                        except:
                            continue
            return raw
        except:
            return raw

    def _parse_checkout_json(self, raw: str) -> Optional[Dict[str, Any]]:
        try:
            details_raw = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', raw, flags=re.DOTALL)
            match = re.search(r'(\{.*\})', details_raw, re.DOTALL)
            if match:
                details_str = match.group(1)
                for i in range(len(details_str), 0, -1):
                    if details_str[i-1] == '}':
                        try:
                            candidate = details_str[:i].replace('\n', ' ').replace('\r', '').strip()
                            data = json.loads(candidate)
                            # Deep-parse 'items' if double-encoded
                            if data and "items" in data and isinstance(data["items"], str):
                                try:
                                    data["items"] = json.loads(data["items"])
                                except:
                                    data["items"] = ast.literal_eval(data["items"])
                            return data
                        except:
                            try:
                                return ast.literal_eval(details_str[:i])
                            except:
                                continue
        except Exception as e:
            logger.error(f"SignalProcessor checkout parsing error: {e}")
        return None
