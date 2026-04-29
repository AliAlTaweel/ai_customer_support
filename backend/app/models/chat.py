from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    state: Optional[Dict[str, Any]] = None
    user_name: Optional[str] = None
    user_id: Optional[str] = None

class GreetRequest(BaseModel):
    first_name: str
    user_id: Optional[str] = None

class TokenUsage(BaseModel):
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    successful_requests: int = 1

class ChatResponse(BaseModel):
    message: str
    state: Dict[str, Any]
    usage: Optional[TokenUsage] = None

class HealthResponse(BaseModel):
    status: str
    version: str
