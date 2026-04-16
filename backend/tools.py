import sqlite3
import os
from crewai.tools import tool

# Path to the local SQLite database
DB_PATH = os.path.join(os.path.dirname(__file__), "../db/mvp.db")

@tool
def get_order_status(order_id: str) -> str:
    """Fetches the status of a specific order. Input MUST be the numeric ID only (e.g. 1001). 
    If this tool returns 'not found', it means the order ID does not exist in our database."""
    try:
        # Robustness: Remove common prefix/labels, quotes, and whitespace
        clean_id = str(order_id).lower().replace("order_id=", "").replace("'", "").replace("\"", "").strip()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT status, order_date, amount FROM orders WHERE order_id = ?", (int(clean_id),))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return f"Order {order_id}: Status={row[0]}, Date={row[1]}, Total=${row[2]}"
        return f"Order {order_id} not found."
    except Exception as e:
        return f"Error accessing database: {str(e)}"

@tool
def get_customer_info(email: str) -> str:
    """Fetches customer profile details including name and signup date using an email address. Use this for 'Who am I?' or 'Check my profile' queries."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name, signup_date, country FROM customers WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return f"Customer: {row[0]}, Signed up: {row[1]}, Location: {row[2]}"
        return f"Customer with email {email} not found."
    except Exception as e:
        return f"Error accessing database: {str(e)}"

@tool
def search_products(query: str) -> str:
    """Searches the product catalog for items matching a specific term. Use this for 'Do you have headphones?' or 'Search for products' queries."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Simple LIKE search for the query
        cursor.execute("SELECT name, description, price FROM products WHERE name LIKE ? OR description LIKE ?", (f"%{query}%", f"%{query}%"))
        rows = cursor.fetchall()
        conn.close()
        
        if rows:
            results = [f"{r[0]}: {r[1]} (${r[2]})" for r in rows]
            return "\n".join(results[:5]) # Return top 5 matches
        return f"No products found matching '{query}'."
    except Exception as e:
        return f"Error accessing database: {str(e)}"
