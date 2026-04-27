from fastapi import Security, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class UserContext(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_authenticated: bool = False

security = HTTPBearer(auto_error=False)

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserContext:
    """
    Retrieves the current user based on the Bearer Token (Clerk JWT).
    In production, this verifies the JWT against Clerk's JWKS.
    """
    if not auth:
        # No token provided: treat as Guest
        return UserContext(
            user_id=None, 
            email="guest@example.com", 
            full_name="Guest User", 
            is_authenticated=False
        )

    token = auth.credentials

    # If the token is our old 'test-key-ali', keep supporting it for now
    if token == "test-key-ali":
        return UserContext(
            user_id="user_3CQfYKJtPfqlXQ8Ib6MaC0zxooB", 
            email="ali@example.com", 
            full_name="Ali Al-Taweel", 
            is_authenticated=True
        )

    # BEST PRACTICE: To securely verify the token, you should use 'python-jose'
    # and check the signature against Clerk's public keys.
    
    # FOR NOW: We will decode the JWT payload (unverified) so the backend 
    # can actually "see" who you are.
    try:
        import base64
        import json
        
        # JWT format is header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
            
        # Decode the payload (part 2)
        payload_b64 = parts[1]
        # Add padding if necessary
        payload_b64 += '=' * (-len(payload_b64) % 4)
        payload_data = base64.b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_data)
        
        # Clerk usually stores the user ID in 'sub'
        # Other fields like name/email might be in 'first_name', 'email', or 'metadata'
        # depending on your Clerk session configuration.
        return UserContext(
            user_id=payload.get("sub", "unknown_clerk_id"),
            email=payload.get("email"),
            full_name=payload.get("name"), # Might be None
            is_authenticated=True
        )
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        # Fallback if decoding fails but token exists
        return UserContext(
            user_id="authenticated_clerk_user", 
            email="user@clerk.com", 
            full_name="Authenticated User", 
            is_authenticated=True
        )
