import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from app.tools.base import engine, detokenize_val

logger = logging.getLogger(__name__)

def submit_complaint(subject: str, message: str, customer_name: str = None, customer_email: str = None, user_id: str = None, priority: str = "MEDIUM") -> str:
    """
    Submit a formal complaint or message to the administration team.
    
    Args:
        subject: The subject of the complaint.
        message: The detailed message.
        customer_name: The customer's name.
        customer_email: The customer's email.
        user_id: The ID of the user.
        priority: Priority of the complaint (LOW, MEDIUM, HIGH, URGENT).
    """
    subject = detokenize_val(subject)
    message = detokenize_val(message)
    customer_name = detokenize_val(customer_name)
    customer_email = detokenize_val(customer_email)
    logger.info(f"Submitting complaint: '{subject}' from {customer_name}")

    try:
        with engine.begin() as connection:
            complaint_id = f"CMP-{str(uuid.uuid4())}"
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
            return f"Your message has been successfully submitted. Reference ID: {complaint_id}. (Note: This is a reference for your message, not an order tracking number)."
    except Exception as e:
        logger.error(f"Error submitting complaint: {e}")
        return f"Error submitting complaint: {str(e)}"
