import requests

url = "http://localhost:3001/api/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "cancel this order bf39dad9-2ee2-4db4-b0dc-223848ab2d92",
    "history": [],
    "state": {}
}

response = requests.post(url, json=data)
print(response.json())
