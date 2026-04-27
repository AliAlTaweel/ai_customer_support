from app.tools.database_tools import get_order_details_fn, cancel_order_fn, place_order_fn
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath("backend"))

def test_tools():
    print("Testing get_order_details_fn with auth_email...")
    # This might fail if DB is empty, but we want to see if it runs
    res = get_order_details_fn(order_id="test_id", auth_email="user@example.com")
    print(f"Result: {res}")

    print("\nTesting cancel_order_fn with auth_email...")
    res = cancel_order_fn(order_id="test_id", auth_email="user@example.com")
    print(f"Result: {res}")

    print("\nTesting place_order_fn with shipping_address...")
    # This should return an error about product not found, which is fine
    res = place_order_fn(
        customer_email="user@example.com",
        customer_name="Test User",
        items=[{"product_name": "NonExistent", "quantity": 1}],
        shipping_address="123 Main St"
    )
    print(f"Result: {res}")

if __name__ == "__main__":
    test_tools()
