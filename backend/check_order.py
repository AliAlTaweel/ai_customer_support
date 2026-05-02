from app.tools.base import engine
from sqlalchemy import text
import sys

order_id = "8301bd8d-3164-47a0-8eb1-62c20c4597b2"

with engine.connect() as conn:
    res = conn.execute(text('SELECT * FROM "Order" WHERE id = :id'), {"id": order_id}).fetchone()
    if res:
        print(f"Order found: {dict(res._mapping)}")
    else:
        print("Order not found")
