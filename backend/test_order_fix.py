from app.tools.order_tools import get_order_details_fn
from app.core.privacy import PII_MAPPING
import sys

order_id = "8301bd8d-3164-47a0-8eb1-62c20c4597b2"
user_id = "user_3CQfYKJtPfqlXQ8Ib6MaC0zxooB"

# Simulate authenticated state
PII_MAPPING.set({"[AUTH_EMAIL]": "ali.altaweel@example.com"})

print(f"Testing with order_id and user_id:")
res = get_order_details_fn(order_id=order_id, user_id=user_id)
print(f"Result: {res}")

print(f"\nTesting with order_id and email mapping:")
res = get_order_details_fn(order_id=order_id, customer_email="[AUTH_EMAIL]")
print(f"Result: {res}")
