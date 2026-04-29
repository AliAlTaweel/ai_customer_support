import re
from typing import Optional, Dict
from contextvars import ContextVar

# ContextVar to store PII mapping for the current request/thread
PII_MAPPING: ContextVar[Dict[str, str]] = ContextVar("pii_mapping", default={})

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
    def pseudonymize_text(text: Optional[str]) -> tuple[str, dict[str, str]]:
        """
        Replaces PII with unique tokens and returns the mapping.
        Example: "My email is test@example.com" -> ("My email is [EMAIL_0]", {"[EMAIL_0]": "test@example.com"})
        """
        if not text:
            return "", {}
        
        mapping = {}
        scrubbed = text
        
        # 1. Pseudonymize Emails
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
        for i, email in enumerate(emails):
            token = f"[EMAIL_{i}]"
            mapping[token] = email
            scrubbed = scrubbed.replace(email, token)
            
        # 2. Pseudonymize Phone Numbers
        phones = re.findall(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}', scrubbed)
        # findall might return tuples if there are groups, we want the whole match
        # Let's use finditer for better control
        phone_matches = list(re.finditer(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}', scrubbed))
        for i, match in enumerate(phone_matches):
            phone = match.group(0)
            token = f"[PHONE_{i}]"
            mapping[token] = phone
            scrubbed = scrubbed.replace(phone, token)
            
        return scrubbed, mapping

    @staticmethod
    def detokenize(value: str, mapping: dict[str, str]) -> str:
        """Restores a pseudonymized token to its original value."""
        if not value or not isinstance(value, str):
            return value
        return mapping.get(value, value)

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
