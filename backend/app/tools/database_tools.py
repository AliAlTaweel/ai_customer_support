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

def get_order_details_fn(order_id: str = None, email: str = None):
    """Retrieve order details using order ID or customer email."""
    try:
        with engine.connect() as connection:
            if order_id:
                query = text("SELECT * FROM 'Order' WHERE id = :order_id")
                params = {"order_id": order_id}
            elif email:
                query = text("SELECT * FROM 'Order' WHERE customerEmail = :email ORDER BY createdAt DESC LIMIT 1")
                params = {"email": email}
            else:
                return "Please provide either an order ID or an email."

            result = connection.execute(query, params)
            order = result.fetchone()
            
            if not order:
                return "Order not found."
            
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
def get_order_details(order_id: str = None, email: str = None):
    """Retrieve order details using order ID or customer email."""
    return get_order_details_fn(order_id, email)

def cancel_order_fn(order_id: str):
    """Cancel an order given its ID. Only PENDING or PROCESSING orders can be cancelled."""
    try:
        with engine.connect() as connection:
            # Check status first
            check = connection.execute(
                text("SELECT status FROM 'Order' WHERE id = :order_id"),
                {"order_id": order_id}
            ).fetchone()
            
            if not check:
                return "Order not found."
            
            if check._mapping['status'] not in ['PENDING', 'PROCESSING']:
                return f"Cannot cancel order with status: {check._mapping['status']}. Only PENDING or PROCESSING orders can be cancelled."
            
            # Update status
            connection.execute(
                text("UPDATE 'Order' SET status = 'CANCELLED' WHERE id = :order_id"),
                {"order_id": order_id}
            )
            connection.commit()
            return f"Order {order_id} has been successfully cancelled."
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        return f"Error cancelling order: {str(e)}"

@tool("cancel_order")
def cancel_order(order_id: str):
    """
    Cancel an existing order using its Order ID. 
    Use this tool ONLY after the customer has explicitly confirmed they want to proceed with the cancellation (e.g., by saying "yes").
    Only orders with PENDING or PROCESSING status can be cancelled.
    """
    return cancel_order_fn(order_id)

def place_order_fn(customer_email: str, customer_name: str, items: list):
    """
    Place a new order. 
    'items' should be a list of dictionaries, each with 'product_name' and 'quantity'.
    """
    if not items:
        return "Error: No items provided for the order."

    try:
        with engine.connect() as connection:
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
                    INSERT INTO 'Order' (id, total, status, createdAt, updatedAt, customerEmail, customerName, shippingAddress)
                    VALUES (:id, :total, 'PENDING', :now, :now, :email, :name, 'Pending Selection')
                """),
                {"id": order_id, "total": total_price, "now": now, "email": customer_email, "name": customer_name}
            )

            for item_data in order_items_to_create:
                connection.execute(
                    text("INSERT INTO OrderItem (id, orderId, productId, quantity, price) VALUES (:id, :orderId, :productId, :quantity, :price)"),
                    {"id": item_data['id'], "orderId": order_id, "productId": item_data['productId'], "quantity": item_data['quantity'], "price": item_data['price']}
                )
                connection.execute(
                    text("UPDATE Product SET stock = stock - :qty WHERE id = :pid"),
                    {"qty": item_data['quantity'], "pid": item_data['productId']}
                )

            connection.commit()
            return f"Successfully placed order! Order ID: {order_id}. Total: ${total_price:.2f}"
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return f"Error placing order: {str(e)}"

@tool("place_order")
def place_order(customer_email: str, customer_name: str, items: Any):
    """
    Creates a new order in the system. 
    'items' should be a list of objects, e.g. [{"product_name": "Product A", "quantity": 1}]
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
    
    return place_order_fn(customer_email, customer_name, items)

def save_chat_message_fn(role: str, content: str, user_name: str = None):
    """Save a chat message to the database."""
    try:
        with engine.connect() as connection:
            connection.execute(
                text("INSERT INTO ChatMessage (id, role, content, userName, createdAt) VALUES (:id, :role, :content, :user_name, :now)"),
                {
                    "id": str(uuid.uuid4()),
                    "role": role,
                    "content": content,
                    "user_name": user_name,
                    "now": datetime.now().isoformat()
                }
            )
            connection.commit()
            return True
    except Exception as e:
        logger.error(f"Error saving chat message: {e}")
        return False

def get_chat_history_fn(user_name: str = None, limit: int = 15):
    """Retrieve chat history from the database, returning the latest messages in chronological order."""
    try:
        with engine.connect() as connection:
            if user_name:
                query = text("SELECT role, content, createdAt FROM ChatMessage WHERE userName = :user_name ORDER BY createdAt DESC LIMIT :limit")
                params = {"user_name": user_name, "limit": limit}
            else:
                query = text("SELECT role, content, createdAt FROM ChatMessage ORDER BY createdAt DESC LIMIT :limit")
                params = {"limit": limit}
            
            result = connection.execute(query, params)
            messages = [dict(row._mapping) for row in result]
            
            # Reverse to get chronological order (oldest to newest) for the UI
            messages.reverse()
            return messages
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        return []
