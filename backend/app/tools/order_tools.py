import uuid
import logging
import json
import ast
from typing import Any
from datetime import datetime
from sqlalchemy import text
from crewai.tools import tool
from app.tools.base import engine, detokenize_val
from app.core.privacy import PrivacyScrubber, PII_MAPPING

logger = logging.getLogger(__name__)

def get_order_details_fn(order_id: str = None, email: str = None, customer_email: str = None):
    """Retrieve order details using order ID or customer email."""
    mapping = PII_MAPPING.get() or {}
    auth_email = mapping.get("[AUTH_EMAIL]")
    
    order_id = detokenize_val(order_id)
    email = detokenize_val(email)
    customer_email = detokenize_val(customer_email)
    
    if auth_email and not customer_email and not email:
        customer_email = auth_email
        
    logger.info(f"Retrieving order details. ID: {order_id}, Email: {email}, Customer Email: {customer_email}")
    try:
        with engine.connect() as connection:
            if order_id:
                target_filter_email = customer_email or email
                if target_filter_email:
                    query = text('SELECT * FROM "Order" WHERE id = :order_id AND "customerEmail" ILIKE :email')
                    params = {"order_id": order_id, "email": target_filter_email}
                else:
                    return "For security reasons, please provide the email address associated with the order."
            elif customer_email or email:
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
            items_result = connection.execute(
                text('SELECT p.name, oi.quantity, oi.price FROM "OrderItem" oi JOIN "Product" p ON oi."productId" = p.id WHERE oi."orderId" = :order_id'),
                {"order_id": order_dict['id']}
            )
            items = [dict(row._mapping) for row in items_result]
            order_dict['items'] = items
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
    order_id = detokenize_val(order_id)
    customer_email = detokenize_val(customer_email)
    logger.info(f"Attempting to cancel order: {order_id} (CustomerEmail: {customer_email}, UserID: {user_id})")
    try:
        with engine.connect() as connection:
            if user_id:
                check_query = text('SELECT status FROM "Order" WHERE id = :order_id AND "userId" = :user_id')
                params = {"order_id": order_id, "user_id": user_id}
            elif customer_email:
                check_query = text('SELECT status FROM "Order" WHERE id = :order_id AND "customerEmail" ILIKE :customer_email')
                params = {"order_id": order_id, "customer_email": customer_email}
            else:
                return "Error: Ownership verification required. For security, please provide the email address associated with this order to proceed with cancellation."

            check = connection.execute(check_query, params).fetchone()
            if not check:
                return "Order not found or you do not have permission to cancel it."
            
            check_data = check._mapping
            current_status = str(check_data['status']).upper().strip()
            if current_status not in ['PENDING', 'PROCESSING']:
                return f"Cannot cancel order with status: {check_data['status']}. Only PENDING or PROCESSING orders can be cancelled."
            
            update_query = text(f"UPDATE \"Order\" SET status = 'CANCELLED' {str(check_query).split('FROM \"Order\"')[1]}")
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

def place_order_fn(customer_email: str, customer_name: str, items: list, shipping_address: str, user_id: str = None, payment_method: str = "Card"):
    """Place a new order."""
    logger.info(f"Placing order for {customer_name} ({customer_email}), UserID: {user_id}")
    customer_email = detokenize_val(customer_email)
    customer_name = detokenize_val(customer_name)
    shipping_address = detokenize_val(shipping_address)
    payment_method = detokenize_val(payment_method)

    if not items:
        return "Error: No items provided for the order."
    if not shipping_address or shipping_address == "Pending Selection":
        return "Error: A valid shipping address is required to place an order."

    try:
        with engine.begin() as connection:
            total_price = 0.0
            order_items_to_create = []
            for item in items:
                name = detokenize_val(item.get('product_name'))
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
                    INSERT INTO "Order" (id, total, status, "createdAt", "updatedAt", "customerEmail", "customerName", "shippingAddress", "userId", "paymentMethod")
                    VALUES (:id, :total, 'PENDING', :now, :now, :email, :name, :address, :user_id, :payment)
                """),
                {"id": order_id, "total": total_price, "now": now,
                 "email": customer_email, "name": customer_name,
                 "address": shipping_address, "user_id": user_id, "payment": payment_method}
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
            return f"Successfully placed order! Order ID: {order_id}. Total: ${total_price:.2f}. Shipping to: {shipping_address}"
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return f"Error placing order: {str(e)}"

@tool("place_order")
def place_order(customer_email: str, customer_name: str, items: Any, shipping_address: str, user_id: str = None):
    """Creates a new order in the system."""
    if isinstance(items, str):
        try:
            cleaned_items = items.replace("'", "\"")
            items = json.loads(cleaned_items)
        except Exception:
            try:
                items = ast.literal_eval(items)
            except Exception as e:
                return f"Error: Could not parse items list. Error: {str(e)}"
    return place_order_fn(customer_email, customer_name, items, shipping_address, user_id)
