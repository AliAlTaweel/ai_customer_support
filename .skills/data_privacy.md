# Data Privacy & GDPR Implementation Plan

This document outlines the strategy for ensuring that sensitive user data (PII) is masked before being sent to any LLM (Local or Cloud), ensuring compliance with GDPR and best privacy practices.

## 1. Core Philosophy: The "Privacy Proxy"
The LLM should never receive raw Personally Identifiable Information (PII). Instead, it should work with **Pseudonyms** or **Masked Data**. 
*   **Raw Data:** `John Doe`, `john.doe@email.com`, `123 Main St, London`
*   **Masked Data:** `[CUSTOMER_NAME]`, `joh***@email.com`, `[REDACTED_ADDRESS]`

---

## 2. Implementation Architecture

### A. The `PrivacyScrubber` Utility
Create a centralized utility in `app/core/privacy.py` to handle all masking logic. It uses Microsoft Presidio for advanced NLP entity recognition and Regex as a fallback.

```python
import logging
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

class PrivacyScrubber:
    @staticmethod
    def pseudonymize_text(text: str) -> tuple[str, dict]:
        # Uses Presidio NLP to catch Names and Locations, 
        # plus Regex fallback for Emails and Phones.
        pass
```

### B. Integration in `CrewService`
Modify `backend/app/services/crew_service.py` to scrub the `user_info` context.

```python
# In kickoff_chat:
scrubbed_name = PrivacyScrubber.mask_name(user_name)
scrubbed_email = PrivacyScrubber.mask_email(user_context.email) if user_context else "Guest"

user_info = f"Customer Name: {scrubbed_name}\n"
user_info += f"Customer Email: {scrubbed_email}\n"
```

### C. Integration in Database Tools
Modify `backend/app/tools/database_tools.py` to scrub return values.

```python
def get_order_details_fn(...):
    order = # ... fetch from DB ...
    order_dict = dict(order._mapping)
    # Mask sensitive fields before returning to LLM
    order_dict['customerEmail'] = PrivacyScrubber.mask_email(order_dict['customerEmail'])
    order_dict['shippingAddress'] = PrivacyScrubber.mask_address(order_dict['shippingAddress'])
    return str(order_dict)
```

---

## 3. GDPR Compliance Checklist for AWS Deployment

1.  **[ ] Data Processing Agreement (DPA):** Accept the AWS GDPR DPA in the AWS Artifact Console.
2.  **[ ] Data Residency:** Use AWS Regions in the EU (e.g., `eu-central-1` Frankfurt).
3.  **[ ] Encryption at Rest:** Use Amazon RDS with AES-256 encryption enabled.
4.  **[ ] Encryption in Transit:** Ensure all API calls (Frontend -> Backend -> Bedrock) use TLS 1.2+.
5.  **[ ] Right to Erasure:** Implement an endpoint `DELETE /api/v1/user/data` to wipe chat history and PII.
6.  **[ ] Privacy Notice:** Update the frontend to include a clear notice that AI is used to process requests.

---

## 4. Next Steps
1.  Create `backend/app/core/privacy.py`.
2.  Refactor `CrewService` to use the scrubber.
3.  Refactor `database_tools.py` to scrub database results.
