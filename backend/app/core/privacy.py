import re
from typing import Optional, Dict
from contextvars import ContextVar
import logging

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

logger = logging.getLogger(__name__)

# ContextVar to store PII mapping for the current request/thread
PII_MAPPING: ContextVar[Dict[str, str]] = ContextVar("pii_mapping", default={})

# Configure Presidio to use the small Spacy model to match our optimized Docker image
nlp_config = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}

try:
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    provider = NlpEngineProvider(nlp_configuration=nlp_config)
    nlp_engine = provider.create_engine()
    analyzer = AnalyzerEngine(nlp_engine=nlp_engine, default_score_threshold=0.4)
    anonymizer = AnonymizerEngine()
except Exception as e:
    logger.error(f"Failed to initialize Presidio: {e}")
    analyzer = None
    anonymizer = None

def encrypt_val_fn(plaintext: str) -> str:
    try:
        from cryptography.fernet import Fernet
        from app.core.config import settings
        key = getattr(settings, "ENCRYPTION_KEY", None)
        if not key:
            raise ValueError("ENCRYPTION_KEY settings is missing.")
        if isinstance(key, str):
            key = key.encode()
        fernet = Fernet(key)
        encrypted = fernet.encrypt(plaintext.encode())
        return encrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        return plaintext

def decrypt_val_fn(ciphertext: str) -> str:
    try:
        from cryptography.fernet import Fernet
        from app.core.config import settings
        key = getattr(settings, "ENCRYPTION_KEY", None)
        if not key:
            raise ValueError("ENCRYPTION_KEY settings is missing.")
        if isinstance(key, str):
            key = key.encode()
        fernet = Fernet(key)
        decrypted = fernet.decrypt(ciphertext.encode())
        return decrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        return None

class PrivacyScrubber:
    """
    Utility class to mask Personally Identifiable Information (PII) 
    before it is sent to an LLM using stateless symmetric encryption.
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
        return f"{name[0]}***" if len(name) > 1 else "[CUSTOMER]"

    @staticmethod
    def mask_address(address: Optional[str]) -> str:
        if not address:
            return "N/A"
        return "[REDACTED_SHIPPING_ADDRESS]"

    @staticmethod
    def pseudonymize_text(text: Optional[str]) -> tuple[str, dict[str, str]]:
        """
        Replaces PII with unique encrypted tokens and returns a mapping.
        Example: "My email is test@example.com" -> ("My email is [ENC_EMAIL:gAAAAAB...]", {"[ENC_EMAIL:gAAAAAB...]": "test@example.com"})
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
                for result in sorted_results:
                    entity_type = result.entity_type
                    if entity_type in ['DATE_TIME', 'NRP']:
                        continue
                    original_value = scrubbed[result.start:result.end]
                    encrypted_value = encrypt_val_fn(original_value)
                    token = f"[ENC_{entity_type}:{encrypted_value}]"
                    mapping[token] = original_value
                    scrubbed = scrubbed[:result.start] + token + scrubbed[result.end:]
                    logger.debug(f"Scrubbed after {entity_type}: {scrubbed}")
            except Exception as e:
                logger.error(f"Presidio error: {e}")
        
        # 1. Pseudonymize Emails (Fallback/Regex)
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', scrubbed)
        for email in list(set(emails)):
            encrypted_value = encrypt_val_fn(email)
            token = f"[ENC_EMAIL:{encrypted_value}]"
            mapping[token] = email
            scrubbed = scrubbed.replace(email, token)
            
        # 2. Pseudonymize Phone Numbers (Fallback/Regex)
        phone_matches = list(re.finditer(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}', scrubbed))
        for match in list(set([m.group(0) for m in phone_matches])):
            encrypted_value = encrypt_val_fn(match)
            token = f"[ENC_PHONE:{encrypted_value}]"
            mapping[token] = match
            scrubbed = scrubbed.replace(match, token)
            
        # 3. Pseudonymize potential Addresses (Basic Regex Fallback)
        address_patterns = [
            r'\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)',
            r'P\.?O\.?\s*Box\s*\d+',
            r'[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}'
        ]
        for pattern in address_patterns:
            matches = re.finditer(pattern, scrubbed, re.IGNORECASE)
            for match in matches:
                addr = match.group(0)
                if addr not in mapping.values():
                    encrypted_value = encrypt_val_fn(addr)
                    token = f"[ENC_ADDRESS:{encrypted_value}]"
                    mapping[token] = addr
                    scrubbed = scrubbed.replace(addr, token)
            
        if mapping:
            # Avoid logging raw token keys as they contain the sensitive ciphertext
            logger.info(f"Pseudonymization complete. Created {len(mapping)} secure PII tokens.")
            
        return scrubbed, mapping

    @staticmethod
    def detokenize(text: str, mapping: dict[str, str] = None) -> str:
        """Restores pseudonymized tokens within a text to their original values statelessly."""
        if not text or not isinstance(text, str):
            return text
        
        result = text
        
        # 1. Stateless decryption of tokens matching [ENC_TYPE:CIPHERTEXT]
        try:
            token_pattern = r"\[ENC_[A-Z_]+:([A-Za-z0-9\-_=]+)\]"
            def decrypt_match(match):
                ciphertext = match.group(1)
                decrypted = decrypt_val_fn(ciphertext)
                return decrypted if decrypted is not None else match.group(0)
            result = re.sub(token_pattern, decrypt_match, result)
        except Exception as e:
            logger.error(f"Error in stateless detokenize: {e}")
            
        # 2. Backward compatibility with mapping if any exists
        if mapping:
            sorted_tokens = sorted(mapping.keys(), key=len, reverse=True)
            for token in sorted_tokens:
                val = mapping[token]
                if val is not None:
                    result = result.replace(token, str(val))
                else:
                    result = result.replace(token, "")
        return result

    @staticmethod
    def scrub_dict(data: dict, sensitive_fields: list = None) -> dict:
        """Helper to scrub a dictionary of sensitive fields by encrypting them."""
        if sensitive_fields is None:
            sensitive_fields = ["customerEmail", "customerName", "shippingAddress", "email", "name", "address"]
        
        scrubbed = data.copy()
        for field in sensitive_fields:
            if field in scrubbed:
                val = scrubbed[field]
                if not val or not isinstance(val, str):
                    continue
                # If it's already a token, don't double-encrypt
                if val.startswith("[ENC_") and val.endswith("]"):
                    continue
                
                if "email" in field.lower():
                    scrubbed[field] = f"[ENC_EMAIL:{encrypt_val_fn(val)}]"
                elif "name" in field.lower():
                    scrubbed[field] = f"[ENC_NAME:{encrypt_val_fn(val)}]"
                elif "address" in field.lower():
                    scrubbed[field] = f"[ENC_ADDRESS:{encrypt_val_fn(val)}]"
        return scrubbed
