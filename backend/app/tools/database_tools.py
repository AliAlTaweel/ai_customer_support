import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from typing import List, Dict, Any, Optional
from crewai.tools import tool
from app.core.config import settings
from app.core.privacy import PrivacyScrubber, PII_MAPPING
import logging
import os

logger = logging.getLogger(__name__)

def detokenize_val(val: Any) -> Any:
    """Helper to detokenize a value using the current request context mapping."""
    if isinstance(val, str):
        mapping = PII_MAPPING.get()
        if not mapping:
            logger.debug(f"Detokenization mapping is empty for value: {val}")
        detokenized = PrivacyScrubber.detokenize(val, mapping)
        if detokenized != val:
            logger.debug(f"Detokenized value: {val} -> [REDACTED]")
        return detokenized
    return val

# Initialize engine
def get_db_url():
    if settings.DATABASE_URL:
        url = settings.DATABASE_URL
        if url.startswith("file:"):
            # Convert Prisma style URL to SQLAlchemy style
            path = url.replace("file:", "")
            if not path.startswith("/"):
                # Handle relative path
                return f"sqlite:///{os.path.abspath(path)}"
            return f"sqlite:///{path}"
        return url
    return f"sqlite:///{settings.DB_PATH}"

DATABASE_URL = get_db_url()
engine = create_engine(DATABASE_URL)

def search_products_fn(query: str):
    """Search for products by name, description, or category."""
    logger.info(f"Searching products with query: {query}")
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text('SELECT name, description, price, category, stock FROM "Product" WHERE name ILIKE :query OR category ILIKE :query'),
                {"query": f"%{query}%"}
            )
            products = [dict(row._mapping) for row in result]
            if not products:
                return "No products found matching your search."
            return str(products)
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        return f"Error searching products: {str(e)}"

@tool("search_products")
def search_products(query: str):
    """
    Search for physical products in the Luxe catalog by name, description, or category. 
    Use this ONLY for product discovery. Do NOT use this for policies, shipping, or order management.
    """
    return search_products_fn(query)

def get_order_details_fn(order_id: str = None, email: str = None, customer_email: str = None):
    """Retrieve order details using order ID or customer email."""
    # Auto-inject AUTH_EMAIL if available to avoid relying on LLM to pass it correctly
    mapping = PII_MAPPING.get() or {}
    auth_email = mapping.get("[AUTH_EMAIL]")
    
    # GDPR: Detokenize inputs
    order_id = detokenize_val(order_id)
    email = detokenize_val(email)
    customer_email = detokenize_val(customer_email)
    
    if auth_email and not customer_email and not email:
        customer_email = auth_email
        
    logger.info(f"Retrieving order details. ID: {order_id}, Email: {email}, Customer Email: {customer_email}")
    try:
        with engine.connect() as connection:
            if order_id:
                # Security: Even with an ID, we filter by the authenticated email if provided.
                # If guest, we STILL require an 'email' to match the order.
                target_filter_email = customer_email or email
                
                if target_filter_email:
                    query = text('SELECT * FROM "Order" WHERE id = :order_id AND "customerEmail" ILIKE :email')
                    params = {"order_id": order_id, "email": target_filter_email}
                else:
                    # If NO email is provided at all, we reject the lookup for security (prevents order scraping)
                    return "For security reasons, please provide the email address associated with the order."
            elif customer_email or email:
                # If searching by email only, we use the provided email
                target_email = customer_email or email
                query = text('SELECT * FROM "Order" WHERE "customerEmail" ILIKE :email ORDER BY "createdAt" DESC LIMIT 1')
                params = {"email": target_email}
            else:
                return "Please provide either an order ID or your email address."

            result = connection.execute(query, params)
            order = result.fetchone()
            
            if not order:
                return "Order not found or you do not have permission to view it."
            
            order_dict = dict(order._mapping)
            
            # Fetch items
            items_result = connection.execute(
                text('SELECT p.name, oi.quantity, oi.price FROM "OrderItem" oi JOIN "Product" p ON oi."productId" = p.id WHERE oi."orderId" = :order_id'),
                {"order_id": order_dict['id']}
            )
            items = [dict(row._mapping) for row in items_result]
            order_dict['items'] = items
            
            # GDPR: Scrub sensitive data before returning to LLM
            scrubbed_order = PrivacyScrubber.scrub_dict(order_dict)
            
            return str(scrubbed_order)
    except Exception as e:
        logger.error(f"Error getting order details: {e}")
        return f"Error retrieving order: {str(e)}"

@tool("get_order_details")
def get_order_details(order_id: str = None, email: str = None, customer_email: str = None):
    """
    Retrieve order details using order ID or customer email.
    If 'customer_email' is provided, results are strictly filtered to that user.
    """
    return get_order_details_fn(order_id, email, customer_email)

def cancel_order_fn(order_id: str, customer_email: str = None, user_id: str = None):
    """Cancel an order given its ID. Only PENDING or PROCESSING orders can be cancelled."""
    # GDPR: Detokenize inputs
    order_id = detokenize_val(order_id)
    customer_email = detokenize_val(customer_email)
    logger.info(f"Attempting to cancel order: {order_id} (CustomerEmail: {customer_email}, UserID: {user_id})")
    try:
        with engine.connect() as connection:
            # Ownership check: must match either email OR user_id
            if user_id:
                check_query = text('SELECT status FROM "Order" WHERE id = :order_id AND "userId" = :user_id')
                params = {"order_id": order_id, "user_id": user_id}
            elif customer_email:
                check_query = text('SELECT status FROM "Order" WHERE id = :order_id AND "customerEmail" ILIKE :customer_email')
                params = {"order_id": order_id, "customer_email": customer_email}
            else:
                logger.warning(f"Order cancellation ownership check failed: no credentials provided for order {order_id}")
                return "Error: Ownership verification required. For security, please provide the email address associated with this order to proceed with cancellation."

            check = connection.execute(check_query, params).fetchone()
            
            if not check:
                return "Order not found or you do not have permission to cancel it."
            
            check_data = check._mapping
            current_status = str(check_data['status']).upper().strip()
            
            if current_status not in ['PENDING', 'PROCESSING']:
                return f"Cannot cancel order with status: {check_data['status']}. Only PENDING or PROCESSING orders can be cancelled."
            
            # Update status
            update_query = text('UPDATE "Order" SET status = \'CANCELLED\' WHERE id = :order_id')
            if user_id:
                update_query = text('UPDATE "Order" SET status = \'CANCELLED\' WHERE id = :order_id AND "userId" = :user_id')
            elif customer_email:
                update_query = text('UPDATE "Order" SET status = \'CANCELLED\' WHERE id = :order_id AND "customerEmail" ILIKE :customer_email')
            
            connection.execute(update_query, params)
            connection.commit()
            return f"Order {order_id} has been successfully cancelled."
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        return f"Error cancelling order: {str(e)}"

@tool("cancel_order")
def cancel_order(order_id: str, confirmed: bool = False, customer_email: str = None):
    """
    Cancel an existing order using its Order ID. 
    'confirmed' MUST be set to True to execute the cancellation. 
    ONLY set 'confirmed' to True if the user has already replied 'yes' to a previous confirmation request.
    If 'customer_email' is provided, it must match the order's customer email.
    Only orders with PENDING or PROCESSING status can be cancelled.
    """
    if not confirmed:
        return f"CONFIRMATION_REQUIRED: {order_id}"
    
    return cancel_order_fn(order_id, customer_email)

def place_order_fn(customer_email: str, customer_name: str, items: list, shipping_address: str, user_id: str = None):
    """
    Place a new order. 
    'items' should be a list of dictionaries, each with 'product_name' and 'quantity'.
    'shipping_address' is mandatory for delivery.
    """
    logger.info(f"Placing order for {customer_name} ({customer_email}), UserID: {user_id}")
    
    # GDPR: Detokenize input values before DB insertion
    customer_email = detokenize_val(customer_email)
    customer_name = detokenize_val(customer_name)
    shipping_address = detokenize_val(shipping_address)

    if not items:
        logger.warning("Order placement failed: No items provided")
        return "Error: No items provided for the order."
    
    if not shipping_address or shipping_address == "Pending Selection":
        logger.warning("Order placement failed: Invalid shipping address")
        return "Error: A valid shipping address is required to place an order."

    try:
        # engine.begin() creates an implicit transaction: auto-commits on success,
        # auto-rolls-back on any exception — ensures atomicity across all inserts.
        with engine.begin() as connection:
            total_price = 0.0
            order_items_to_create = []

            for item in items:
                name = item.get('product_name')
                qty = item.get('quantity', 1)

                product = connection.execute(
                    text('SELECT id, price, stock FROM "Product" WHERE name = :name'),
                    {"name": name}
                ).fetchone()

                if not product:
                    return f"Error: Product '{name}' not found."

                product_data = product._mapping
                if product_data['stock'] < qty:
                    return f"Error: Not enough stock for '{name}'. Available: {product_data['stock']}"

                total_price += product_data['price'] * qty
                order_items_to_create.append({
                    "id": str(uuid.uuid4()),
                    "productId": product_data['id'],
                    "quantity": qty,
                    "price": product_data['price']
                })

            order_id = str(uuid.uuid4())
            now = datetime.now().isoformat()

            connection.execute(
                text("""
                    INSERT INTO "Order" (id, total, status, "createdAt", "updatedAt", "customerEmail", "customerName", "shippingAddress", "userId")
                    VALUES (:id, :total, 'PENDING', :now, :now, :email, :name, :address, :user_id)
                """),
                {"id": order_id, "total": total_price, "now": now,
                 "email": customer_email, "name": customer_name,
                 "address": shipping_address, "user_id": user_id}
            )

            for item_data in order_items_to_create:
                connection.execute(
                    text('INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, price) VALUES (:id, :orderId, :productId, :quantity, :price)'),
                    {"id": item_data['id'], "orderId": order_id, "productId": item_data['productId'],
                     "quantity": item_data['quantity'], "price": item_data['price']}
                )
                connection.execute(
                    text('UPDATE "Product" SET stock = stock - :qty WHERE id = :pid'),
                    {"qty": item_data['quantity'], "pid": item_data['productId']}
                )

            # No explicit commit needed — engine.begin() handles it
            return f"Successfully placed order! Order ID: {order_id}. Total: ${total_price:.2f}. Shipping to: {shipping_address}"
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return f"Error placing order: {str(e)}"

@tool("place_order")
def place_order(customer_email: str, customer_name: str, items: Any, shipping_address: str, user_id: str = None):
    """
    Creates a new order in the system. 
    'items' should be a list of objects, e.g. [{"product_name": "Product A", "quantity": 1}]
    'shipping_address' is the physical address for delivery.
    """
    import json
    if isinstance(items, str):
        try:
            # Clean up the string if it has single quotes or other common LLM artifacts
            cleaned_items = items.replace("'", "\"")
            items = json.loads(cleaned_items)
        except Exception:
            # If json.loads fails, try to use literal_eval for safety
            import ast
            try:
                items = ast.literal_eval(items)
            except Exception as e:
                return f"Error: Could not parse items list. Please provide a valid list. Error: {str(e)}"
    
    return place_order_fn(customer_email, customer_name, items, shipping_address, user_id)

def save_chat_message_fn(role: str, content: str, user_name: str = None, user_id: str = None, prompt_tokens: int = None, completion_tokens: int = None, total_tokens: int = None):
    """Save a chat message to the database with optional token usage tracking."""
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
    """
    Retrieve chat history from the database, returning the latest messages in chronological order.
    Prefers querying by user_id (unique) over user_name (collision-prone) when both are available.
    """
    try:
        with engine.connect() as connection:
            if user_id and user_name:
                # Query by either user_id or user_name (fallback for missing user_id in older rows)
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
            
            # Format rows to match the frontend expectation (usage object)
            messages = []
            for row in rows:
                msg = {
                    "role": row["role"],
                    "content": row["content"],
                }
                if row.get("totalTokens"):
                    msg["usage"] = {
                        "prompt_tokens": row["promptTokens"],
                        "completion_tokens": row["completionTokens"],
                        "total_tokens": row["totalTokens"]
                    }
                messages.append(msg)
            
            # Reverse to get chronological order (oldest to newest) for the UI
            messages.reverse()
            return messages
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        return []

def submit_complaint_fn(subject: str, message: str, customer_name: str = None, customer_email: str = None, user_id: str = None, priority: str = "MEDIUM"):
    """
    Submit a complaint or message to the admin.
    Priority can be LOW, MEDIUM, HIGH, or URGENT.
    """
    # GDPR: Detokenize input values before DB insertion
    subject = detokenize_val(subject)
    message = detokenize_val(message)
    customer_name = detokenize_val(customer_name)
    customer_email = detokenize_val(customer_email)
    logger.info(f"Submitting complaint: '{subject}' from {customer_name}")

    try:
        with engine.begin() as connection:
            complaint_id = str(uuid.uuid4())
            # Use UTC ISO format with Z suffix for better Prisma/JS compatibility
            now = datetime.utcnow().isoformat() + "Z"
            
            # Ensure priority is uppercase as expected by frontend logic
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
            return f"Your message has been successfully submitted and dispatched to our administration team via internal email. Reference ID: {complaint_id}. A support specialist will review this and get back to you shortly."
    except Exception as e:
        logger.error(f"Error submitting complaint: {e}")
        return f"Error submitting complaint: {str(e)}"

@tool("submit_complaint")
def submit_complaint(subject: str, message: str, customer_name: str = None, customer_email: str = None, user_id: str = None, priority: str = "MEDIUM"):
    """
    Submit a formal complaint, feedback, or a message to the human administration team.
    Use this when the user is frustrated, has a complex issue that the AI cannot solve, or explicitly asks to speak with a human or leave a message for the admin.
    Required: subject, message.
    Optional: customer_name, customer_email, user_id, priority.
    """
    return submit_complaint_fn(subject, message, customer_name, customer_email, user_id, priority)

def delete_chat_history_fn(user_id: str) -> bool:
    """Hard delete all chat messages for a specific user (GDPR Article 17)."""
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
    """Delete chat messages older than X days to comply with data retention policies."""
    try:
        with engine.begin() as connection:
            # PostgreSQL/SQLite compatible date subtraction logic
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
