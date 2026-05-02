import re
import logging
from typing import Dict, Any
from app.core.privacy import PrivacyScrubber

logger = logging.getLogger(__name__)

class ResponseCleaner:
    @staticmethod
    def clean_and_format(final_message: str, pii_mapping: Dict[str, str]) -> str:
        """
        Detokenizes the response and removes any internal AI signals or artifacts.
        """
        # 1. GDPR: Detokenize
        final_message = PrivacyScrubber.detokenize(final_message, pii_mapping)

        # 2. Aggressive Signal Removal (in case they weren't caught by the signal processor)
        signals_to_clean = [
            "PLACE_ORDER_SUMMARY", "CHECKOUT_REQUIRED", "YES_NO_REQUIRED", 
            "CONFIRMATION_REQUIRED", "PRODUCT_LIST", "NOT_APPLICABLE", "NO_FAQ_RESULT",
            "TRACKING_INFO"
        ]
        for sentinel in signals_to_clean:
            # Remove the signal and anything after it (signals should be at the end)
            final_message = re.split(rf"{sentinel}:?", final_message, flags=re.IGNORECASE)[0].strip()
        
        # 3. Tool Call & Result Removal
        # Remove "Tool result: [...]" or "Tool result: {...}"
        final_message = re.sub(r"Tool result:?\s*(?:\[|\{)[\s\S]*?(?:\]|\})", "", final_message, flags=re.IGNORECASE).strip()
        
        # Remove raw JSON objects and arrays that might be leaked tool calls or results
        # We look for something that starts with { or [ and ends with } or ] and contains typical JSON keys/values
        # We also remove things like PRODUCT_LIST: [...] if they weren't caught by the signal processor
        final_message = re.sub(r"(?:PRODUCT_LIST|PLACE_ORDER_SUMMARY|CHECKOUT_REQUIRED|CONFIRMATION_REQUIRED|TRACKING_INFO):?\s*(?:\[|\{)[\s\S]*?(?:\]|\})", "", final_message, flags=re.IGNORECASE).strip()
        
        # Standalone JSON-like blocks (e.g. tool outputs)
        # Match from the first { or [ to the last } or ] if it contains JSON-like patterns
        final_message = re.sub(r"(?:^|\s)(?:\{|\[)\s*\"[\s\S]*?(?:\}|\])(?:\s|$)", "\n", final_message).strip()
        
        # Remove standalone tool call patterns like {"name": "...", "parameters": {...}}
        final_message = re.sub(r"\{\s*\"name\":\s*\"[^\"]+\",\s*\"parameters\":\s*\{[\s\S]*?\}\s*\}", "", final_message).strip()

        # 4. Remove chain-of-thought and internal monologue
        prefixes = [
            "Final Answer:", "Final Response:", "Agent Output:", r"Response from \w[\w ]*:",
            r"To help the user.*I will use.*",
            r"To track/check.*I will use.*",
            r"I will now search.*",
            r"I will use the.*tool.*",
            r"I'm going to.*use.*",
            r"Action:.*",
            r"Action Input:.*",
            r"Thought:.*"
        ]
        for prefix in prefixes:
            final_message = re.sub(prefix, "", final_message, flags=re.IGNORECASE).strip()

        # 5. Final Sweep: Remove lingering JSON or Markdown code blocks
        final_message = re.sub(r"```(?:json)?\s*[\s\S]*?```", "", final_message).strip()
        
        # Cleanup whitespace
        final_message = re.sub(r"\n{3,}", "\n\n", final_message).strip()

        # Detect if signals were present before cleaning (optional but helpful)
        had_signal = any(s in final_message.upper() for s in signals_to_clean)
        
        if not final_message or len(final_message.strip()) < 2:
            if had_signal:
                final_message = "Please see the interactive card above to continue."
            else:
                final_message = "I'm sorry, I couldn't find a specific answer. How else can I help?"

        return final_message
