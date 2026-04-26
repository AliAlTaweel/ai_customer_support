from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, GreetRequest, ChatMessage
from app.services.crew_service import CrewService
from app.tools.database_tools import save_chat_message_fn, get_chat_history_fn
import logging

logger = logging.getLogger(__name__)
import asyncio

router = APIRouter()

@router.post("/chat/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        crew_service = CrewService()
        
        # Format history for CrewAI
        formatted_history = [
            f"{m.role.capitalize()}: {m.content}" 
            for m in request.history
        ]
        
        # Kickoff the crew in a background thread to avoid blocking the event loop
        response_data = await asyncio.to_thread(
            crew_service.kickoff_chat, 
            request.message, 
            formatted_history, 
            request.user_name,
            request.state
        )
        
        final_message = response_data["result"]
        usage = response_data.get("usage", {})
        state_update = response_data.get("state_update", {})
        
        # PERSIST TO DATABASE
        # These are also blocking DB calls, should ideally be async or offloaded
        await asyncio.to_thread(save_chat_message_fn, role="user", content=request.message, user_name=request.user_name)
        await asyncio.to_thread(save_chat_message_fn, role="assistant", content=final_message, user_name=request.user_name)
        
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
        
        return ChatResponse(message=final_message, state=new_state, usage=usage)
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/greet")
async def greet(request: GreetRequest):
    try:
        crew_service = CrewService()
        response_data = await asyncio.to_thread(crew_service.get_greeting, request.first_name)
        return {
            "message": response_data["result"],
            "usage": response_data["usage"]
        }
    except Exception as e:
        logger.error(f"Error in greet endpoint: {e}")
        return {
            "message": f"Hello {request.first_name}! I'm the Luxe Assistant. How can I help you today?",
            "usage": {}
        }

@router.get("/history/{user_name}")
async def get_history(user_name: str):
    try:
        messages = get_chat_history_fn(user_name=user_name)
        return {"history": messages}
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return {"history": []}
