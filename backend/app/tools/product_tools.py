from sqlalchemy import text
from crewai.tools import tool
import logging
from app.tools.base import engine

logger = logging.getLogger(__name__)

def search_products_fn(query: str):
    """Search for products by name, description, or category."""
    logger.info(f"Searching products with query: {query}")
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text('SELECT id, name, description, price, category, stock, "imageUrl", details FROM "Product" WHERE name ILIKE :query OR category ILIKE :query'),
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
