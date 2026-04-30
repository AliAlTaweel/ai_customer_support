import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from crewai.tools import tool
from app.tools.base import engine, detokenize_val

logger = logging.getLogger(__name__)

def submit_complaint_fn(subject: str, message: str, customer_name: str = None, customer_email: str = None, user_id: str = None, priority: str = "MEDIUM"):
    """Submit a complaint or message to the admin."""
    subject = detokenize_val(subject)
    message = detokenize_val(message)
    customer_name = detokenize_val(customer_name)
    customer_email = detokenize_val(customer_email)
    logger.info(f"Submitting complaint: '{subject}' from {customer_name}")

    try:
        with engine.begin() as connection:
            complaint_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat() + "Z"
            prio = priority.upper() if priority else "MEDIUM"
            if prio not in ["LOW", "MEDIUM", "HIGH", "URGENT"]:
                prio = "MEDIUM"

            connection.execute(
                text("""
                    INSERT INTO "Complaint" (id, subject, message, "customerName", "customerEmail", "userId", status, priority, "createdAt", "updatedAt")
                    VALUES (:id, :subject, :message, :name, :email, :user_id, 'OPEN', :priority, :now, :now)
                """),
                {
                    "id": complaint_id,
                    "subject": subject,
                    "message": message,
                    "name": customer_name,
                    "email": customer_email,
                    "user_id": user_id,
                    "priority": prio,
                    "now": now
                }
            )
            return f"Your message has been successfully submitted. Reference ID: {complaint_id}."
    except Exception as e:
        logger.error(f"Error submitting complaint: {e}")
        return f"Error submitting complaint: {str(e)}"

@tool("submit_complaint")
def submit_complaint(subject: str, message: str, customer_name: str = None, customer_email: str = None, user_id: str = None, priority: str = "MEDIUM"):
    """Submit a formal complaint or message to the administration team."""
    return submit_complaint_fn(subject, message, customer_name, customer_email, user_id, priority)
