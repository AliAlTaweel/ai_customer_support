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

        # 2. Aggressive Signal Removal
        signals_to_clean = [
            "PLACE_ORDER_SUMMARY", "CHECKOUT_REQUIRED", "YES_NO_REQUIRED", 
            "CONFIRMATION_REQUIRED", "NOT_APPLICABLE", "NO_FAQ_RESULT"
        ]
        for sentinel in signals_to_clean:
            final_message = re.split(rf"{sentinel}:?", final_message, flags=re.IGNORECASE)[0].strip()
        
        # 3. Final Sweep: Remove lingering JSON or Markdown
        final_message = re.sub(r"```(?:json)?\s*\{.*\}\s*```", "", final_message, flags=re.DOTALL).strip()
        final_message = re.sub(r"\{[\s\S]*\"product_name\"[\s\S]*\}", "", final_message).strip()
        
        # 4. Remove chain-of-thought artifacts
        prefixes = ["Final Answer:", "Final Response:", "Agent Output:", r"Response from \w[\w ]*:"]
        for prefix in prefixes:
            final_message = re.sub(prefix, "", final_message, flags=re.IGNORECASE).strip()
            
        final_message = re.sub(r"\n{3,}", "\n\n", final_message).strip()

        if not final_message or len(final_message) < 10:
            final_message = "I'm sorry, I wasn't able to find a specific answer. How else can I help?"

        return final_message
