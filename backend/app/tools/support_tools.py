import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from app.tools.base import engine, detokenize_val
from app.core.auth import CURRENT_TENANT_DB_ID
from app.core.privacy import PrivacyScrubber

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
    tenant_id = CURRENT_TENANT_DB_ID.get()
    subject = detokenize_val(subject)
    message = detokenize_val(message)
    customer_name = detokenize_val(customer_name)
    customer_email = detokenize_val(customer_email)
    masked_name = PrivacyScrubber.mask_name(customer_name) if customer_name else None
    logger.info(f"Submitting complaint: '{subject}' from {masked_name}, Tenant: {tenant_id}")

    # Auto-extract tags based on message contents
    tags = []
    lower_msg = message.lower() if message else ""
    lower_sub = subject.lower() if subject else ""
    
    if any(w in lower_msg or w in lower_sub for w in ["refund", "charge", "payment", "price", "double", "money", "billing", "fee", "cost"]):
        tags.append("Billing")
    if any(w in lower_msg or w in lower_sub for w in ["shipping", "delivery", "track", "ups", "fedex", "dhl", "carrier", "receive", "delay", "mail"]):
        tags.append("Shipping")
    if any(w in lower_msg or w in lower_sub for w in ["damaged", "broken", "quality", "defective", "product", "size", "item", "faulty"]):
        tags.append("Product")
    if any(w in lower_msg or w in lower_sub for w in ["account", "password", "login", "auth", "signin", "signup", "website", "bug", "error"]):
        tags.append("Technical")
        
    if not tags:
        tags.append("General")

    try:
        with engine.begin() as connection:
            complaint_id = f"CMP-{str(uuid.uuid4())[:8].upper()}"
            now = datetime.utcnow().isoformat() + "Z"
            prio = priority.upper() if priority else "MEDIUM"
            if prio not in ["LOW", "MEDIUM", "HIGH", "URGENT"]:
                prio = "MEDIUM"

            chat_session_id = user_id or customer_email

            if tenant_id:
                sql = """
                    INSERT INTO "Complaint" (id, subject, message, "customerName", "customerEmail", "userId", status, priority, tags, "chatSessionId", "createdAt", "updatedAt", "tenantId")
                    VALUES (:id, :subject, :message, :name, :email, :user_id, 'OPEN', :priority, :tags, :chat_session_id, :now, :now, :tenant_id)
                """
                params = {
                    "id": complaint_id,
                    "subject": subject,
                    "message": message,
                    "name": customer_name,
                    "email": customer_email,
                    "user_id": user_id,
                    "priority": prio,
                    "tags": tags,
                    "chat_session_id": chat_session_id,
                    "now": now,
                    "tenant_id": tenant_id
                }
            else:
                sql = """
                    INSERT INTO "Complaint" (id, subject, message, "customerName", "customerEmail", "userId", status, priority, tags, "chatSessionId", "createdAt", "updatedAt")
                    VALUES (:id, :subject, :message, :name, :email, :user_id, 'OPEN', :priority, :tags, :chat_session_id, :now, :now)
                """
                params = {
                    "id": complaint_id,
                    "subject": subject,
                    "message": message,
                    "name": customer_name,
                    "email": customer_email,
                    "user_id": user_id,
                    "priority": prio,
                    "tags": tags,
                    "chat_session_id": chat_session_id,
                    "now": now
                }

            connection.execute(text(sql), params)
            return f"Your message has been successfully submitted. Reference ID: {complaint_id}. (Note: This is a reference for your message, not an order tracking number)."
    except Exception as e:
        logger.error(f"Error submitting complaint: {e}")
        return f"Error submitting complaint: {str(e)}"

def get_user_complaints(customer_email: str) -> str:
    """
    Retrieve all complaints/tickets submitted by a specific customer using their email.
    
    Args:
        customer_email: The email address of the customer.
    """
    tenant_id = CURRENT_TENANT_DB_ID.get()
    customer_email = detokenize_val(customer_email)
    masked_email = PrivacyScrubber.mask_email(customer_email) if customer_email else None
    logger.info(f"Retrieving complaints for user email: {masked_email}, Tenant: {tenant_id}")
    
    try:
        with engine.connect() as connection:
            if tenant_id:
                sql = 'SELECT id, subject, status, priority, "createdAt" FROM "Complaint" WHERE "customerEmail" = :email AND "tenantId" = :tenant_id ORDER BY "createdAt" DESC'
                params = {"email": customer_email, "tenant_id": tenant_id}
            else:
                sql = 'SELECT id, subject, status, priority, "createdAt" FROM "Complaint" WHERE "customerEmail" = :email ORDER BY "createdAt" DESC'
                params = {"email": customer_email}
                
            result = connection.execute(text(sql), params)
            rows = [dict(row._mapping) for row in result]
            
            if not rows:
                return f"No support complaints or tickets found under email '{customer_email}'."
                
            summary = [f"Found {len(rows)} ticket(s) under email '{customer_email}':"]
            for idx, r in enumerate(rows, 1):
                summary.append(f"{idx}. Ticket ID: {r['id']} | Subject: '{r['subject']}' | Status: {r['status']} | Priority: {r['priority']} | Created: {r['createdAt']}")
            
            return "\n".join(summary)
    except Exception as e:
        logger.error(f"Error retrieving user complaints: {e}")
        return f"Error retrieving complaints: {str(e)}"

def get_complaint_status(ticket_id: str) -> str:
    """
    Retrieve the status and full details of a specific complaint/ticket using its ID.
    
    Args:
        ticket_id: The ID of the ticket (e.g. CMP-xxx).
    """
    tenant_id = CURRENT_TENANT_DB_ID.get()
    ticket_id = detokenize_val(ticket_id)
    logger.info(f"Retrieving complaint status for ticket ID: {ticket_id}, Tenant: {tenant_id}")
    
    try:
        with engine.connect() as connection:
            if tenant_id:
                sql = 'SELECT * FROM "Complaint" WHERE id = :ticket_id AND "tenantId" = :tenant_id'
                params = {"ticket_id": ticket_id, "tenant_id": tenant_id}
            else:
                sql = 'SELECT * FROM "Complaint" WHERE id = :ticket_id'
                params = {"ticket_id": ticket_id}
                
            result = connection.execute(text(sql), params)
            row = result.mappings().first()
            
            if not row:
                return f"No ticket found with ID '{ticket_id}'."
                
            ticket = dict(row)
            details = [
                f"Ticket ID: {ticket['id']}",
                f"Subject: {ticket['subject']}",
                f"Status: {ticket['status']}",
                f"Priority: {ticket['priority']}",
                f"Tags: {', '.join(ticket['tags']) if ticket.get('tags') else 'None'}",
                f"Created At: {ticket['createdAt']}",
                f"Updated At: {ticket['updatedAt']}",
                f"Message: \"{ticket['message']}\""
            ]
            if ticket.get('internalNotes'):
                details.append(f"Agent Action Notes: \"{ticket['internalNotes']}\"")
                
            return "\n".join(details)
    except Exception as e:
        logger.error(f"Error retrieving complaint status: {e}")
        return f"Error retrieving ticket status: {str(e)}"
