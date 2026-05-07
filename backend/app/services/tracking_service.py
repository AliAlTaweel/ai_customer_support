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
        
        # Handle Cancelled orders
        if status == "CANCELLED":
            return {
                "active": False,
                "message": "This order has been cancelled. Tracking information is no longer available."
            }

        # If not pending, processing, shipped or completed, return basic info
        if status not in ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED", "DELIVERED"]:
            return {
                "active": False,
                "message": f"Tracking will be available once the order is processed."
            }
        
        # If COMPLETED or DELIVERED, set progress to 100%
        is_completed = status in ["COMPLETED", "DELIVERED"]
        is_processing = status == "PROCESSING"
        is_pending = status == "PENDING"
        
        if is_completed:
            progress = 1.0
        elif is_processing:
            progress = 0.1
        elif is_pending:
            progress = 0.02
        else:
            progress = random.uniform(0.3, 0.8)
        
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
        
        milestones = []
        if is_pending:
            milestones = [
                {"status": "Order Placed", "time": "Just now", "completed": True},
                {"status": "Awaiting Processing", "time": "Waiting", "completed": False},
                {"status": "Picked Up", "time": "Waiting", "completed": False},
                {"status": "In Transit", "time": "Waiting", "completed": False}
            ]
        elif is_processing:
            milestones = [
                {"status": "Order Received", "time": "Today", "completed": True},
                {"status": "Processing", "time": "Now", "completed": True},
                {"status": "Picked Up", "time": "Waiting", "completed": False},
                {"status": "In Transit", "time": "Waiting", "completed": False}
            ]
        else:
            milestones = [
                {"status": "Label Created", "time": "2 days ago", "completed": True},
                {"status": "Picked Up", "time": "Yesterday", "completed": True},
                {"status": "In Transit", "time": "Today", "completed": True},
                {"status": "Out for Delivery", "time": "Tomorrow", "completed": is_completed}
            ]

        return {
            "active": True,
            "status": status,
            "deliveryMessage": "Order placed, awaiting processing" if is_pending else ("Preparing your order" if is_processing else ("Delivered successfully" if is_completed else "Your package is on schedule")),
            "trackingNumber": order_data.get("trackingNumber") or f"1Z{order_id[:6].upper()}{random.randint(1000, 9999)}",
            "carrier": order_data.get("carrier") or "UPS",
            "estimatedDelivery": "Estimated 3-5 days" if is_pending else ("Estimated Tomorrow" if is_processing else ("Delivered" if is_completed else "Tomorrow by 7:00 PM")),
            "origin": origin,
            "destination": destination,
            "currentLocation": {"lat": current_lat, "lng": current_lng},
            "progress": progress,
            "milestones": milestones
        }

