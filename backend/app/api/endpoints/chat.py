from app.models.chat import ChatRequest, ChatResponse, GreetRequest, ChatMessage, TokenUsage
from app.services.crew_service import CrewService
from app.tools.database_tools import save_chat_message_fn, get_chat_history_fn
from app.core.auth import get_current_user, UserContext
from fastapi import APIRouter, HTTPException, Depends, status
import logging

logger = logging.getLogger(__name__)
import asyncio

router = APIRouter()

@router.post("/chat/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, 
    current_user: UserContext = Depends(get_current_user)
):
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
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens")
        )
        
        # User message (usually has 0 usage or we can leave it empty)
        await asyncio.to_thread(save_chat_message_fn, role="user", content=request.message, user_name=target_user_name)
        
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
            new_state.update({k: v for k, v in request.state.items() if k not in new_state})
        new_state.update(state_update)
        
        return ChatResponse(message=final_message, state=new_state, usage=usage_data)
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        # We strictly use current_user.full_name from the token, NOT from a URL parameter.
        messages = get_chat_history_fn(user_name=current_user.full_name)
        return {"history": messages}
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return {"history": []}
