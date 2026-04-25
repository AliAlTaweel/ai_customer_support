from app.tools import database_tools
import os

# Set environment variable for test if needed
# os.environ["DB_PATH"] = ...

# Test Product Search
print("Testing Product Search...")
try:
    result = database_tools.search_products_fn(query="Watch")
    print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")

# Test Order Lookup
print("\nTesting Order Lookup...")
try:
    result = database_tools.get_order_details_fn(email="test@example.com")
    print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")
