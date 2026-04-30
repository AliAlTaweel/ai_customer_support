import re
from typing import Optional, Dict
from contextvars import ContextVar
import logging

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

logger = logging.getLogger(__name__)

# ContextVar to store PII mapping for the current request/thread
PII_MAPPING: ContextVar[Dict[str, str]] = ContextVar("pii_mapping", default={})

try:
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
except Exception as e:
    logger.error(f"Failed to initialize Presidio: {e}")
    analyzer = None
    anonymizer = None

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
        
        if analyzer:
            try:
                results = analyzer.analyze(text=scrubbed, language='en')
                logger.debug(f"Presidio results: {results}")
                sorted_results = sorted(results, key=lambda x: x.start, reverse=True)
                counts = {}
                for result in sorted_results:
                    entity_type = result.entity_type
                    if entity_type in ['DATE_TIME', 'NRP']:
                        continue
                    counts[entity_type] = counts.get(entity_type, 0) + 1
                    token = f"[{entity_type}_{counts[entity_type]}]"
                    original_value = scrubbed[result.start:result.end]
                    mapping[token] = original_value
                    scrubbed = scrubbed[:result.start] + token + scrubbed[result.end:]
                    logger.debug(f"Scrubbed after {entity_type}: {scrubbed}")
            except Exception as e:
                logger.error(f"Presidio error: {e}")
        
        # 1. Pseudonymize Emails (Fallback/Regex)
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', scrubbed)
        for i, email in enumerate(emails):
            token = f"[EMAIL_REGEX_{i}]"
            mapping[token] = email
            scrubbed = scrubbed.replace(email, token)
            
        # 2. Pseudonymize Phone Numbers (Fallback/Regex)
        phone_matches = list(re.finditer(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}', scrubbed))
        for i, match in enumerate(phone_matches):
            phone = match.group(0)
            token = f"[PHONE_REGEX_{i}]"
            mapping[token] = phone
            scrubbed = scrubbed.replace(phone, token)
            
        # 3. Pseudonymize potential Addresses (Basic Regex Fallback)
        # Matches typical patterns like "123 Main St", "Apt 4B", etc.
        address_patterns = [
            r'\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)',
            r'P\.?O\.?\s*Box\s*\d+',
            r'[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}'
        ]
        addr_count = 0
        for pattern in address_patterns:
            matches = re.finditer(pattern, scrubbed, re.IGNORECASE)
            for match in matches:
                addr = match.group(0)
                if addr not in mapping.values():
                    token = f"[ADDRESS_REGEX_{addr_count}]"
                    mapping[token] = addr
                    scrubbed = scrubbed.replace(addr, token)
                    addr_count += 1
            
        if mapping:
            logger.info(f"Pseudonymization complete. Tokens created: {list(mapping.keys())}")
            
        return scrubbed, mapping

    @staticmethod
    def detokenize(text: str, mapping: dict[str, str]) -> str:
        """Restores pseudonymized tokens within a text to their original values."""
        if not text or not isinstance(text, str):
            return text
        
        result = text
        # Sorting by length descending ensures that longer tokens (if any overlap) are replaced first
        sorted_tokens = sorted(mapping.keys(), key=len, reverse=True)
        for token in sorted_tokens:
            val = mapping[token]
            if val is not None:
                result = result.replace(token, str(val))
            else:
                # If the original value was None, we remove the token to avoid 
                # leaking the placeholder to the user, or we can replace with a string "N/A"
                result = result.replace(token, "")
        return result

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
