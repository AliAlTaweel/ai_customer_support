from sqlalchemy import text
import logging
from app.tools.base import engine
from app.core.auth import CURRENT_TENANT_DB_ID

logger = logging.getLogger(__name__)

def search_products(query: str) -> str:
    """
    Search for physical products in the Luxe catalog by name, description, or category. 
    Use this ONLY for product discovery. Do NOT use this for policies, shipping, or order management.
    
    Args:
        query (str): The search term to find products.
        
    Returns:
        str: A stringified list of matching products or a not found message.
    """
    tenant_id = CURRENT_TENANT_DB_ID.get()
    logger.info(f"Searching products with query: {query}, Tenant: {tenant_id}")
    try:
        with engine.connect() as connection:
            sql = 'SELECT id, name, description, price, category, stock, "imageUrl", details FROM "Product" WHERE (name ILIKE :query OR category ILIKE :query OR description ILIKE :query)'
            params = {"query": f"%{query}%"}
            
            if tenant_id:
                sql += ' AND "tenantId" = :tenant_id'
                params["tenant_id"] = tenant_id
                
            result = connection.execute(text(sql), params)
            products = [dict(row._mapping) for row in result]
            if not products:
                return "No products found matching your search."
            return str(products)
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        return f"Error searching products: {str(e)}"
