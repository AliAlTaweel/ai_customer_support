from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatResponseSchema(BaseModel):
    message: str = Field(description="The natural language response to the user. Do not include tool output directly, synthesize it into a human-friendly format.")
    ui_signals: List[str] = Field(
        default_factory=list, 
        description="Machine-readable signals for the frontend (e.g., 'CHECKOUT_REQUIRED', 'PRODUCT_LIST', 'TRACKING_INFO')."
    )
    payload: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="JSON object containing dynamic data for the UI, like mock tracking info or product arrays."
    )
