import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from typing import List, Dict, Any, Optional
from crewai.tools import tool
from app.core.config import settings
import logging
import os

logger = logging.getLogger(__name__)

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
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT name, description, price, category, stock FROM Product WHERE name LIKE :query OR category LIKE :query"),
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

def get_order_details_fn(order_id: str = None, email: str = None, auth_email: str = None):
    """Retrieve order details using order ID or customer email."""
    try:
        with engine.connect() as connection:
            if order_id:
                # Security: Even with an ID, we filter by the authenticated email if provided
                if auth_email:
                    query = text("SELECT * FROM 'Order' WHERE id = :order_id AND customerEmail = :auth_email")
                    params = {"order_id": order_id, "auth_email": auth_email}
                else:
                    query = text("SELECT * FROM 'Order' WHERE id = :order_id")
                    params = {"order_id": order_id}
            elif email:
                # If searching by email, we use the provided email but could still check against auth_email
                target_email = auth_email if auth_email else email
                query = text("SELECT * FROM 'Order' WHERE customerEmail = :email ORDER BY createdAt DESC LIMIT 1")
                params = {"email": target_email}
            else:
                return "Please provide either an order ID or an email."

            result = connection.execute(query, params)
            order = result.fetchone()
            
            if not order:
                return "Order not found or you do not have permission to view it."
            
            order_dict = dict(order._mapping)
            
            # Fetch items
            items_result = connection.execute(
                text("SELECT p.name, oi.quantity, oi.price FROM OrderItem oi JOIN Product p ON oi.productId = p.id WHERE oi.orderId = :order_id"),
                {"order_id": order_dict['id']}
            )
            items = [dict(row._mapping) for row in items_result]
            order_dict['items'] = items
            
            return str(order_dict)
    except Exception as e:
        logger.error(f"Error getting order details: {e}")
        return f"Error retrieving order: {str(e)}"

@tool("get_order_details")
def get_order_details(order_id: str = None, email: str = None, auth_email: str = None):
    """
    Retrieve order details using order ID or customer email.
    If 'auth_email' is provided, results are strictly filtered to that user.
    """
    return get_order_details_fn(order_id, email, auth_email)

def cancel_order_fn(order_id: str, auth_email: str = None):
    """Cancel an order given its ID. Only PENDING or PROCESSING orders can be cancelled."""
    try:
        with engine.connect() as connection:
            # Check status and ownership first
            if auth_email:
                check_query = text("SELECT status, customerEmail FROM 'Order' WHERE id = :order_id AND customerEmail = :auth_email")
                params = {"order_id": order_id, "auth_email": auth_email}
            else:
                check_query = text("SELECT status, customerEmail FROM 'Order' WHERE id = :order_id")
                params = {"order_id": order_id}
                
            check = connection.execute(check_query, params).fetchone()
            
            if not check:
                return "Order not found or you do not have permission to cancel it."
            
            check_data = check._mapping
            if check_data['status'] not in ['PENDING', 'PROCESSING']:
                return f"Cannot cancel order with status: {check_data['status']}. Only PENDING or PROCESSING orders can be cancelled."
            
            # Update status
            update_query = text("UPDATE 'Order' SET status = 'CANCELLED' WHERE id = :order_id")
            if auth_email:
                update_query = text("UPDATE 'Order' SET status = 'CANCELLED' WHERE id = :order_id AND customerEmail = :auth_email")
            
            connection.execute(update_query, params)
            connection.commit()
            return f"Order {order_id} has been successfully cancelled."
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        return f"Error cancelling order: {str(e)}"

@tool("cancel_order")
def cancel_order(order_id: str, auth_email: str = None):
    """
    Cancel an existing order using its Order ID. 
    If 'auth_email' is provided, it must match the order's customer email.
    Use this tool ONLY after the customer has explicitly confirmed they want to proceed with the cancellation (e.g., by saying "yes").
    Only orders with PENDING or PROCESSING status can be cancelled.
    """
    return cancel_order_fn(order_id, auth_email)

def place_order_fn(customer_email: str, customer_name: str, items: list, shipping_address: str, user_id: str = None):
    """
    Place a new order. 
    'items' should be a list of dictionaries, each with 'product_name' and 'quantity'.
    'shipping_address' is mandatory for delivery.
    """
    if not items:
        return "Error: No items provided for the order."
    
    if not shipping_address or shipping_address == "Pending Selection":
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
                    text("SELECT id, price, stock FROM Product WHERE name = :name"),
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
                    INSERT INTO 'Order' (id, total, status, createdAt, updatedAt, customerEmail, customerName, shippingAddress, userId)
                    VALUES (:id, :total, 'PENDING', :now, :now, :email, :name, :address, :user_id)
                """),
                {"id": order_id, "total": total_price, "now": now,
                 "email": customer_email, "name": customer_name,
                 "address": shipping_address, "user_id": user_id}
            )

            for item_data in order_items_to_create:
                connection.execute(
                    text("INSERT INTO OrderItem (id, orderId, productId, quantity, price) VALUES (:id, :orderId, :productId, :quantity, :price)"),
                    {"id": item_data['id'], "orderId": order_id, "productId": item_data['productId'],
                     "quantity": item_data['quantity'], "price": item_data['price']}
                )
                connection.execute(
                    text("UPDATE Product SET stock = stock - :qty WHERE id = :pid"),
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
                    INSERT INTO ChatMessage (id, role, content, userName, userId, promptTokens, completionTokens, totalTokens, createdAt)
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
            if user_id:
                # Preferred: exact match on immutable user ID
                query = text("SELECT role, content, promptTokens, completionTokens, totalTokens, createdAt FROM ChatMessage WHERE userId = :user_id ORDER BY createdAt DESC LIMIT :limit")
                params = {"user_id": user_id, "limit": limit}
            elif user_name:
                # Fallback: name-based (legacy rows without userId)
                query = text("SELECT role, content, promptTokens, completionTokens, totalTokens, createdAt FROM ChatMessage WHERE userName = :user_name ORDER BY createdAt DESC LIMIT :limit")
                params = {"user_name": user_name, "limit": limit}
            else:
                query = text("SELECT role, content, promptTokens, completionTokens, totalTokens, createdAt FROM ChatMessage ORDER BY createdAt DESC LIMIT :limit")
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
