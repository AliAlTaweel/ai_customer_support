import sys
import os
import uuid
from datetime import datetime

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.tools.database_tools import get_order_details_fn, cancel_order_fn, place_order_fn, engine
from sqlalchemy import text

def setup_test_data():
    print("Setting up test data...")
    with engine.connect() as conn:
        # Create test orders
        order_a_id = "test-order-a"
        order_b_id = "test-order-b"
        
        # Clean up existing test data
        conn.execute(text("DELETE FROM 'Order' WHERE id IN ('test-order-a', 'test-order-b')"))
        
        now = datetime.now().isoformat()
        
        # Order A belongs to user_a@example.com
        conn.execute(text("""
            INSERT INTO 'Order' (id, total, status, createdAt, updatedAt, customerEmail, customerName, shippingAddress)
            VALUES (:id, 100.0, 'PENDING', :now, :now, 'user_a@example.com', 'User A', '123 A St')
        """), {"id": order_a_id, "now": now})
        
        # Order B belongs to user_b@example.com
        conn.execute(text("""
            INSERT INTO 'Order' (id, total, status, createdAt, updatedAt, customerEmail, customerName, shippingAddress)
            VALUES (:id, 200.0, 'PENDING', :now, :now, 'user_b@example.com', 'User B', '456 B St')
        """), {"id": order_b_id, "now": now})
        
        conn.commit()
    return order_a_id, order_b_id

def test_cross_user_access(order_a_id, order_b_id):
    print("\nTesting Cross-User Access...")
    
    # 1. User A tries to view User B's order
    print(f"User A (user_a@example.com) attempting to view Order B ({order_b_id})...")
    result = get_order_details_fn(order_id=order_b_id, customer_email="user_a@example.com")
    print(f"Result: {result}")
    if "Order not found or you do not have permission" not in result:
        raise AssertionError(f"Expected permission error, got: {result}")
    print("✅ PASS: User A cannot view User B's order.")

    # 2. User A tries to cancel User B's order
    print(f"User A (user_a@example.com) attempting to cancel Order B ({order_b_id})...")
    result = cancel_order_fn(order_id=order_b_id, customer_email="user_a@example.com")
    print(f"Result: {result}")
    if "Order not found or you do not have permission" not in result:
        raise AssertionError(f"Expected permission error, got: {result}")
    print("✅ PASS: User A cannot cancel User B's order.")

    # 3. User B tries to view User B's order (Authorized)
    print(f"User B (user_b@example.com) attempting to view Order B ({order_b_id})...")
    result = get_order_details_fn(order_id=order_b_id, customer_email="user_b@example.com")
    if order_b_id not in result:
        raise AssertionError(f"Expected to see order details, got: {result}")
    print("✅ PASS: User B can view their own order.")

def test_missing_address():
    print("\nTesting Missing Address Validation...")
    result = place_order_fn(
        customer_email="test@example.com",
        customer_name="Tester",
        items=[{"product_name": "Leather Handbag", "quantity": 1}],
        shipping_address="Pending Selection"
    )
    print(f"Result: {result}")
    if "Error: A valid shipping address is required" not in result:
        raise AssertionError(f"Expected address error, got: {result}")
    print("✅ PASS: Order placement fails without a valid address.")

def cleanup(order_a_id, order_b_id):
    print("\nCleaning up...")
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM 'Order' WHERE id IN (:a, :b)"), {"a": order_a_id, "b": order_b_id})
        conn.commit()

if __name__ == "__main__":
    try:
        a, b = setup_test_data()
        test_cross_user_access(a, b)
        test_missing_address()
        cleanup(a, b)
        print("\nAll Phase 5 Security Validations PASSED!")
    except Exception as e:
        print(f"\n❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
