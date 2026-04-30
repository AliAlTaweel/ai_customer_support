import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from app.tools.base import engine

logger = logging.getLogger(__name__)

def save_chat_message_fn(role: str, content: str, user_name: str = None, user_id: str = None, prompt_tokens: int = None, completion_tokens: int = None, total_tokens: int = None):
    """Save a chat message to the database."""
    try:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    INSERT INTO "ChatMessage" (id, role, content, "userName", "userId", "promptTokens", "completionTokens", "totalTokens", "createdAt")
                    VALUES (:id, :role, :content, :user_name, :user_id, :prompt, :comp, :total, :now)
                """),
                {
                    "id": str(uuid.uuid4()),
                    "role": role,
                    "content": content,
                    "user_name": user_name,
                    "user_id": user_id,
                    "prompt": prompt_tokens,
                    "comp": completion_tokens,
                    "total": total_tokens,
                    "now": datetime.now().isoformat()
                }
            )
            return True
    except Exception as e:
        logger.error(f"Error saving chat message: {e}")
        return False

def get_chat_history_fn(user_id: str = None, user_name: str = None, limit: int = 15):
    """Retrieve chat history from the database."""
    try:
        with engine.connect() as connection:
            if user_id and user_name:
                query = text('SELECT role, content, "promptTokens", "completionTokens", "totalTokens", "createdAt" FROM "ChatMessage" WHERE "userId" = :user_id OR ("userId" IS NULL AND "userName" = :user_name) ORDER BY "createdAt" DESC LIMIT :limit')
                params = {"user_id": user_id, "user_name": user_name, "limit": limit}
            elif user_id:
                query = text('SELECT role, content, "promptTokens", "completionTokens", "totalTokens", "createdAt" FROM "ChatMessage" WHERE "userId" = :user_id ORDER BY "createdAt" DESC LIMIT :limit')
                params = {"user_id": user_id, "limit": limit}
            elif user_name:
                query = text('SELECT role, content, "promptTokens", "completionTokens", "totalTokens", "createdAt" FROM "ChatMessage" WHERE "userName" = :user_name ORDER BY "createdAt" DESC LIMIT :limit')
                params = {"user_name": user_name, "limit": limit}
            else:
                query = text('SELECT role, content, "promptTokens", "completionTokens", "totalTokens", "createdAt" FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT :limit')
                params = {"limit": limit}
            
            result = connection.execute(query, params)
            rows = [dict(row._mapping) for row in result]
            messages = []
            for row in rows:
                msg = {"role": row["role"], "content": row["content"]}
                if row.get("totalTokens"):
                    msg["usage"] = {
                        "prompt_tokens": row["promptTokens"],
                        "completion_tokens": row["completionTokens"],
                        "total_tokens": row["totalTokens"]
                    }
                messages.append(msg)
            messages.reverse()
            return messages
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        return []

def delete_chat_history_fn(user_id: str) -> bool:
    """Hard delete all chat messages for a specific user."""
    try:
        with engine.begin() as connection:
            connection.execute(
                text('DELETE FROM "ChatMessage" WHERE "userId" = :user_id'),
                {"user_id": user_id}
            )
            return True
    except Exception as e:
        logger.error(f"Error deleting chat history: {e}")
        return False

def purge_old_messages_fn(days: int = 30) -> int:
    """Delete chat messages older than X days."""
    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    DELETE FROM "ChatMessage" 
                    WHERE "createdAt" < (CURRENT_TIMESTAMP - (INTERVAL '1 day' * :days))
                """),
                {"days": days}
            )
            return result.rowcount
    except Exception as e:
        logger.error(f"Error purging old messages: {e}")
        return 0
