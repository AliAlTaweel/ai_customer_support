import sys
import os

# Add the current directory to path so we can import assistant and rag_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from assistant import AgenticAssistant

def test_gatekeeper():
    assistant = AgenticAssistant()
    
    print("\n" + "="*50)
    print("TEST 1: KNOWN FAQ (Should be Fast RAG - No Escalation)")
    print("="*50)
    response1 = assistant.ask("What is your refund policy?")
    print(f"\nFINAL ANSWER:\n{response1}")
    
    print("\n" + "="*50)
    print("TEST 3: ORDER HISTORY (Should be Fast RAG - NO Hallucination)")
    print("="*50)
    response3 = assistant.ask("Why don't I see any orders in my history?")
    print(f"\nFINAL ANSWER:\n{response3}")

if __name__ == "__main__":
    test_gatekeeper()
