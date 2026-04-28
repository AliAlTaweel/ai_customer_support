import re
from typing import Optional

class PrivacyScrubber:
    """
    Utility class to mask Personally Identifiable Information (PII) 
    before it is sent to an LLM.
    """
    
    @staticmethod
    def mask_email(email: Optional[str]) -> str:
        if not email or "@" not in email:
            return "N/A"
        try:
            name, domain = email.split("@")
            masked_name = name[:2] + "***" if len(name) > 2 else "***"
            return f"{masked_name}@{domain}"
        except Exception:
            return "***@***.***"

    @staticmethod
    def mask_name(name: Optional[str]) -> str:
        if not name:
            return "Customer"
        # We can keep the first name if needed for personalization, 
        # but for strict GDPR, we replace it.
        return f"{name[0]}***" if len(name) > 1 else "[CUSTOMER]"

    @staticmethod
    def mask_address(address: Optional[str]) -> str:
        if not address:
            return "N/A"
        # Often LLMs just need to know IF there is an address or what the city is.
        # This masks everything but the general location if possible.
        return "[REDACTED_SHIPPING_ADDRESS]"

    @staticmethod
    def scrub_dict(data: dict, sensitive_fields: list = None) -> dict:
        """Helper to scrub a dictionary of sensitive fields."""
        if sensitive_fields is None:
            sensitive_fields = ["customerEmail", "customerName", "shippingAddress", "email", "name", "address"]
        
        scrubbed = data.copy()
        for field in sensitive_fields:
            if field in scrubbed:
                val = scrubbed[field]
                if "email" in field.lower():
                    scrubbed[field] = PrivacyScrubber.mask_email(val)
                elif "name" in field.lower():
                    scrubbed[field] = PrivacyScrubber.mask_name(val)
                elif "address" in field.lower():
                    scrubbed[field] = PrivacyScrubber.mask_address(val)
        return scrubbed
