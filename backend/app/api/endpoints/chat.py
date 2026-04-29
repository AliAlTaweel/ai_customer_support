from app.models.chat import ChatRequest, ChatResponse, GreetRequest, ChatMessage, TokenUsage
from app.services.crew_service import CrewService
from app.tools.database_tools import save_chat_message_fn, get_chat_history_fn
from app.core.auth import get_current_user, UserContext
from app.core.config import settings
from fastapi import APIRouter, HTTPException, Depends, Request, status
import logging
import time
from collections import defaultdict
from threading import Lock

logger = logging.getLogger(__name__)
import asyncio

router = APIRouter()

# ── Simple in-memory rate limiter ─────────────────────────────────────────────
# Keyed by user_id (authenticated) or remote IP (guest).
# Uses a sliding-window approach.
_rate_store: dict = defaultdict(list)
_rate_lock = Lock()


def _check_rate_limit(key: str) -> bool:
    """Returns False if the key has exceeded the rate limit."""
    now = time.time()
    window_start = now - settings.RATE_LIMIT_WINDOW_SECONDS
    
    with _rate_lock:
        # Periodic cleanup of the entire store to prevent memory leak (e.g. 5% chance per request)
        if len(_rate_store) > 1000 or (now % 100 < 5):
            expired_keys = [k for k, times in _rate_store.items() if not times or max(times) < window_start]
            for k in expired_keys:
                del _rate_store[k]

        # Cleanup the specific key
        _rate_store[key] = [t for t in _rate_store[key] if t > window_start]
        
        if len(_rate_store[key]) >= settings.RATE_LIMIT_REQUESTS:
            return False
        _rate_store[key].append(now)
        return True

@router.post("/chat/chat", response_model=ChatResponse)
async def chat(
    request_obj: Request,
    request: ChatRequest,
    current_user: UserContext = Depends(get_current_user)
):
    # Rate limiting: use user_id for authenticated users, remote IP for guests
    rate_key = current_user.user_id or request_obj.client.host
    if not _check_rate_limit(rate_key):
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please wait before sending another message."
        )
    try:
        crew_service = CrewService()
        
        # Determine the target user name: Token Name > Request Name > Guest
        resolved_name = current_user.full_name or request.user_name or "Guest"
        # Ensure we only use the First Name (take the first word)
        target_user_name = resolved_name.split()[0]
        
        # Format history for CrewAI
        formatted_history = [
            f"{m.role.capitalize()}: {m.content}" 
            for m in request.history
        ]
        
        # Kickoff the crew in a background thread
        response_data = await asyncio.to_thread(
            crew_service.kickoff_chat, 
            request.message, 
            formatted_history, 
            target_user_name,
            request.state,
            user_context=current_user,
            user_id=current_user.user_id if current_user.is_authenticated else request.user_id
        )
        
        final_message = response_data["result"]
        usage = response_data.get("usage", {})
        usage_data = TokenUsage(**usage) if usage else None
        state_update = response_data.get("state_update", {})
        
        # PERSIST TO DATABASE - Use the verified target_user_name and include token usage
        # Assistant message includes usage
        await asyncio.to_thread(
            save_chat_message_fn,
            role="assistant",
            content=final_message,
            user_name=target_user_name,
            user_id=current_user.user_id or request.user_id,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens")
        )

        # User message
        await asyncio.to_thread(
            save_chat_message_fn,
            role="user",
            content=request.message,
            user_name=target_user_name,
            user_id=current_user.user_id or request.user_id
        )
        
        # Update history for response state
        updated_history = request.history + [
            ChatMessage(role="user", content=request.message),
            ChatMessage(role="assistant", content=final_message)
        ]
        
        new_state = {
            "current_intent": "NONE",
            "status": "COMPLETED",
            "entities": request.state.get("entities", {}) if request.state else {},
            "history": [m.model_dump() for m in updated_history]
        }
        
        # Merge state updates if any
        if request.state:
            # Exclude transient keys that should only persist if explicitly returned by the service
            transient_keys = ["pending_confirmation", "pending_order_summary", "pending_order_details"]
            new_state.update({
                k: v for k, v in request.state.items() 
                if k not in new_state and k not in transient_keys
            })
        new_state.update(state_update)
        
        return ChatResponse(message=final_message, state=new_state, usage=usage_data)
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in chat endpoint: {error_msg}")
        
        # Check for Gemini/LiteLLM quota errors
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="The AI service is currently at capacity or quota has been reached. Please try again in a few moments."
            )
            
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/chat/greet")
async def greet(
    request: GreetRequest,
    current_user: UserContext = Depends(get_current_user)
):
    try:
        # Priority: Token Name > Request Name
        resolved_name = current_user.full_name or request.first_name or "there"
        display_name = resolved_name.split()[0]
        
        crew_service = CrewService()
        response_data = await asyncio.to_thread(crew_service.get_greeting, display_name)
        
        final_msg = response_data["result"]
        usage = response_data.get("usage", {})
        
        # Persist greeting to DB
        await asyncio.to_thread(
            save_chat_message_fn, 
            role="assistant", 
            content=final_msg, 
            user_name=display_name,
            user_id=current_user.user_id or request.user_id,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens")
        )

        return {
            "message": final_msg,
            "usage": usage
        }
    except Exception as e:
        logger.error(f"Error in greet endpoint: {e}")
        return {
            "message": f"Hello {display_name if 'display_name' in locals() else request.first_name}! I'm the Luxe Assistant. How can I help you today?",
            "usage": {}
        }

@router.get("/history")
async def get_history(current_user: UserContext = Depends(get_current_user)):
    """
    Securely retrieves chat history for the authenticated user.
    Removing the {user_name} path parameter prevents IDOR (data scraping) leaks.
    """
    if not current_user.is_authenticated:
        # In a real app, you might allow guests to see their own local history,
        # but for DB-persisted history, we require authentication to identify the owner.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="You must be logged in to view chat history."
        )
        
    try:
        # Prefer user_id for exact, collision-free lookup; fall back to full_name
        messages = get_chat_history_fn(
            user_id=current_user.user_id,
            user_name=current_user.full_name
        )
        return {"history": messages}
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return {"history": []}

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history(current_user: UserContext = Depends(get_current_user)):
    """
    GDPR Right to Erasure (Article 17).
    Deletes all chat history associated with the authenticated user.
    """
    if not current_user.is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="You must be logged in to delete chat history."
        )
        
    try:
        from app.tools.database_tools import delete_chat_history_fn
        success = await asyncio.to_thread(
            delete_chat_history_fn,
            user_id=current_user.user_id
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete chat history.")
        return None
    except Exception as e:
        logger.error(f"Error deleting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
