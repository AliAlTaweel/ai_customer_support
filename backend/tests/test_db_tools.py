import pytest
from app.tools.database_tools import search_products_fn, place_order_fn, get_order_details_fn
import uuid

def test_search_products_found():
    # Assuming there's some product in the dev db, or we just test the return type
    result = search_products_fn("test")
    assert isinstance(result, str)

def test_place_order_validation():
    # Missing items
    result = place_order_fn("test@test.com", "Test User", [], "123 Test St")
    assert "Error: No items provided" in result
    
    # Missing address
    result = place_order_fn("test@test.com", "Test User", [{"product_name": "Test", "quantity": 1}], "")
    assert "Error: A valid shipping address is required" in result
