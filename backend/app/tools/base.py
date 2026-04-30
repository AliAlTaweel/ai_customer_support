from sqlalchemy import create_engine
from typing import Any
from app.core.config import settings
from app.core.privacy import PrivacyScrubber, PII_MAPPING
import logging
import os

logger = logging.getLogger(__name__)

def detokenize_val(val: Any) -> Any:
    """Helper to detokenize a value using the current request context mapping."""
    if isinstance(val, str):
        mapping = PII_MAPPING.get()
        if not mapping:
            logger.debug(f"Detokenization mapping is empty for value: {val}")
        detokenized = PrivacyScrubber.detokenize(val, mapping)
        if detokenized != val:
            logger.debug(f"Detokenized value: {val} -> [REDACTED]")
        return detokenized
    return val

def get_db_url():
    if settings.DATABASE_URL:
        url = settings.DATABASE_URL
        if url.startswith("file:"):
            path = url.replace("file:", "")
            if not path.startswith("/"):
                return f"sqlite:///{os.path.abspath(path)}"
            return f"sqlite:///{path}"
        return url
    return f"sqlite:///{settings.DB_PATH}"

DATABASE_URL = get_db_url()
engine = create_engine(DATABASE_URL)
