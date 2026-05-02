import random
from typing import Dict, Any, List

class MockTrackingService:
    @staticmethod
    def get_mock_tracking(order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates mock UPS tracking data for a given order.
        """
        status = order_data.get("status", "PENDING").upper()
        order_id = order_data.get("id", "UNKNOWN")
        
        # If not shipped or completed, return basic info
        if status not in ["SHIPPED", "COMPLETED", "DELIVERED"]:
            return {
                "active": False,
                "message": f"Tracking will be available once the order is shipped."
            }
        
        # If COMPLETED or DELIVERED, set progress to 100%
        is_completed = status in ["COMPLETED", "DELIVERED"]
        progress = 1.0 if is_completed else random.uniform(0.3, 0.8)
        
        # Mock coordinates for a path (Origin: NYC, Destination: User's mock location)
        # In a real app, you'd geocode the shippingAddress
        origin = {"lat": 40.7128, "lng": -74.0060, "name": "UPS Distribution Center, NYC"}
        
        # Randomize destination slightly to make it look real
        dest_lat = 34.0522 + (random.random() - 0.5) * 2 
        dest_lng = -118.2437 + (random.random() - 0.5) * 2
        destination = {"lat": dest_lat, "lng": dest_lng, "name": order_data.get("shippingAddress", "Customer Location")}
        
        # Current progress (already calculated above)
        current_lat = origin["lat"] + (destination["lat"] - origin["lat"]) * progress
        current_lng = origin["lng"] + (destination["lng"] - origin["lng"]) * progress
        
        return {
            "active": True,
            "status": status,
            "deliveryMessage": "Delivered successfully" if is_completed else "Your package is on schedule",
            "trackingNumber": order_data.get("trackingNumber") or f"1Z{order_id[:6].upper()}{random.randint(1000, 9999)}",
            "carrier": order_data.get("carrier") or "UPS",
            "estimatedDelivery": "Delivered" if is_completed else "Tomorrow by 7:00 PM",
            "origin": origin,
            "destination": destination,
            "currentLocation": {"lat": current_lat, "lng": current_lng},
            "progress": progress,
            "milestones": [
                {"status": "Label Created", "time": "2 days ago", "completed": True},
                {"status": "Picked Up", "time": "Yesterday", "completed": True},
                {"status": "In Transit", "time": "Today", "completed": True},
                {"status": "Out for Delivery", "time": "Tomorrow", "completed": False}
            ]
        }
