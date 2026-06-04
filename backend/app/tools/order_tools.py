import uuid
import logging
import json
import ast
from typing import Any, Optional
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from app.tools.base import engine, detokenize_val
from app.core.privacy import PrivacyScrubber
from app.core.auth import CURRENT_TENANT_DB_ID
from app.models.database import Order, OrderItem, Product

logger = logging.getLogger(__name__)
Session = sessionmaker(bind=engine)

def get_order_details(order_id: str = None, email: str = None, customer_email: str = None, user_id: str = None) -> str:
    """
    Retrieve order details using order ID, customer email, or user ID.
    If 'customer_email' or 'user_id' is provided, results are strictly filtered to that user.
    
    Args:
        order_id: The ID of the order.
        email: The email address associated with the order.
        customer_email: The authenticated customer's email.
        user_id: The authenticated user's ID.
    """
    order_id = detokenize_val(order_id)
    email = detokenize_val(email)
    customer_email = detokenize_val(customer_email)
    
    # Ensure ID is stripped of whitespace
    if isinstance(order_id, str):
        order_id = order_id.strip()
        # Auto-prepend mandatory prefix if raw UUID was passed
        if len(order_id) == 36 and order_id.count('-') >= 4 and not order_id.upper().startswith("ORD"):
            order_id = f"ORD-{order_id}"
            
    tenant_id = CURRENT_TENANT_DB_ID.get()
        
    logger.info(f"Retrieving order details. ID: {order_id}, Email: {email}, Customer Email: {customer_email}, UserID: {user_id}, Tenant: {tenant_id}")
    try:
        with Session() as session:
            query = session.query(Order)
            
            if order_id:
                query = query.filter(Order.id.ilike(order_id))
                target_filter_email = customer_email or email
                if user_id:
                    query = query.filter(Order.userId == user_id)
                elif target_filter_email:
                    query = query.filter(Order.customerEmail.ilike(target_filter_email))
                else:
                    return "For security reasons, please provide the email address associated with the order."
            elif user_id:
                query = query.filter(Order.userId == user_id)
            elif customer_email or email:
                target_email = customer_email or email
                query = query.filter(Order.customerEmail.ilike(target_email))
            else:
                return "Please provide either an order ID or your email address."

            if tenant_id:
                query = query.filter(Order.tenantId == tenant_id)

            if not order_id:
                query = query.order_by(Order.createdAt.desc())

            order = query.first()
            if not order:
                return "Order not found or you do not have permission to view it."
            
            items = []
            for item in order.items:
                items.append({
                    "name": item.product.name,
                    "quantity": item.quantity,
                    "price": item.price
                })
                
            order_dict = {
                "id": order.id,
                "userId": order.userId,
                "total": order.total,
                "status": order.status,
                "createdAt": order.createdAt.isoformat() if order.createdAt else None,
                "updatedAt": order.updatedAt.isoformat() if order.updatedAt else None,
                "paymentMethod": order.paymentMethod,
                "shippingAddress": order.shippingAddress,
                "shippingCity": order.shippingCity,
                "shippingCountry": order.shippingCountry,
                "shippingState": order.shippingState,
                "shippingZip": order.shippingZip,
                "customerEmail": order.customerEmail,
                "customerName": order.customerName,
                "trackingNumber": order.trackingNumber,
                "carrier": order.carrier,
                "tenantId": order.tenantId,
                "items": items
            }
            
            scrubbed_order = PrivacyScrubber.scrub_dict(order_dict)
            return str(scrubbed_order)
    except Exception as e:
        logger.error(f"Error getting order details: {e}")
        return f"Error retrieving order: {str(e)}"

def cancel_order(order_id: str, confirmed: bool = False, customer_email: str = None, user_id: str = None) -> str:
    """
    Cancel an existing order using its Order ID. 
    CRITICAL: ONLY call this tool if the user has explicitly asked to CANCEL their order. 
    Do NOT call this tool for status checks or general inquiries.
    'confirmed' MUST be set to True to execute the cancellation. 
    ONLY set 'confirmed' to True if the user has already replied 'yes' to a previous confirmation request.
    If 'customer_email' is provided, it must match the order's customer email.
    Only orders with PENDING, PROCESSING, or SHIPPED status can be cancelled.
    
    Args:
        order_id: The ID of the order to cancel.
        confirmed: Must be True to proceed.
        customer_email: The email of the customer.
        user_id: The ID of the user.
    """
    if not confirmed:
        return f"CONFIRMATION_REQUIRED: {order_id}"
        
    order_id = detokenize_val(order_id)
    customer_email = detokenize_val(customer_email)
    
    # Clean padding
    if isinstance(order_id, str):
        order_id = order_id.strip()
        if len(order_id) == 36 and order_id.count('-') >= 4 and not order_id.upper().startswith("ORD"):
            order_id = f"ORD-{order_id}"
        
    tenant_id = CURRENT_TENANT_DB_ID.get()
    
    logger.info(f"Attempting to cancel order: {order_id} (CustomerEmail: {customer_email}, UserID: {user_id}, Tenant: {tenant_id})")
    try:
        with Session() as session:
            query = session.query(Order).filter(Order.id.ilike(order_id))
            
            if user_id:
                query = query.filter(Order.userId == user_id)
            elif customer_email:
                query = query.filter(Order.customerEmail.ilike(customer_email))
            else:
                return "Error: Ownership verification required. For security, please provide the email address associated with this order to proceed with cancellation."

            if tenant_id:
                query = query.filter(Order.tenantId == tenant_id)

            order = query.first()
            if not order:
                return "Order not found or you do not have permission to cancel it."
            
            current_status = str(order.status).upper().strip()
            if current_status not in ['PENDING', 'PROCESSING', 'SHIPPED']:
                return f"Cannot cancel order with status: {current_status}. Only PENDING, PROCESSING, or SHIPPED orders can be cancelled."
            
            order.status = 'CANCELLED'
            order.updatedAt = datetime.now()
            session.commit()
            return f"Order {order_id} has been successfully cancelled."
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        return f"Error cancelling order: {str(e)}"

def place_order(customer_email: str, customer_name: str, items: Any, shipping_address: str, user_id: str = None, payment_method: str = "Card") -> str:
    """
    Creates a new order in the system.
    
    Args:
        customer_email: Email of the customer.
        customer_name: Name of the customer.
        items: List of items to order.
        shipping_address: The shipping address.
        user_id: The ID of the user.
        payment_method: The payment method used.
    """
    if isinstance(items, str):
        try:
            cleaned_items = items.replace("'", "\"")
            items = json.loads(cleaned_items)
        except Exception:
            try:
                items = ast.literal_eval(items)
            except Exception as e:
                return f"Error: Could not parse items list. Error: {str(e)}"

    tenant_id = CURRENT_TENANT_DB_ID.get()
    logger.info(f"Placing order for {customer_name} ({customer_email}), UserID: {user_id}, Tenant: {tenant_id}")
    customer_email = detokenize_val(customer_email)
    customer_name = detokenize_val(customer_name)
    shipping_address = detokenize_val(shipping_address)
    payment_method = detokenize_val(payment_method)

    if not items:
        return "Error: No items provided for the order."
    if not shipping_address or shipping_address == "Pending Selection":
        return "Error: A valid shipping address is required to place an order."

    try:
        with Session() as session:
            try:
                total_price = 0.0
                order_items_to_create = []
                for item in items:
                    name = detokenize_val(item.get('product_name'))
                    qty = item.get('quantity', 1)
                    
                    product_query = session.query(Product).filter(Product.name == name)
                    if tenant_id:
                        product_query = product_query.filter(Product.tenantId == tenant_id)

                    product = product_query.first()
                    if not product:
                        return f"Error: Product '{name}' not found."
                    
                    if product.stock < qty:
                        return f"Error: Not enough stock for '{name}'. Available: {product.stock}"
                    
                    total_price += product.price * qty
                    order_items_to_create.append({
                        "product": product,
                        "quantity": qty,
                        "price": product.price
                    })

                order_id = f"ORD-{str(uuid.uuid4())}"
                new_order = Order(
                    id=order_id,
                    total=total_price,
                    status='PENDING',
                    createdAt=datetime.now(),
                    updatedAt=datetime.now(),
                    customerEmail=customer_email,
                    customerName=customer_name,
                    shippingAddress=shipping_address,
                    paymentMethod=payment_method,
                    userId=user_id,
                    tenantId=tenant_id
                )
                session.add(new_order)
                
                for item_data in order_items_to_create:
                    prod = item_data["product"]
                    new_item = OrderItem(
                        id=str(uuid.uuid4()),
                        orderId=order_id,
                        productId=prod.id,
                        quantity=item_data["quantity"],
                        price=item_data["price"]
                    )
                    session.add(new_item)
                    prod.stock -= item_data["quantity"]
                    
                session.commit()
                return f"Successfully placed order! Order ID: {order_id}. Total: ${total_price:.2f}. Shipping to: {shipping_address}"
            except Exception as inner_e:
                session.rollback()
                raise inner_e
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return f"Error placing order: {str(e)}"
