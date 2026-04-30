from crewai import Agent, LLM
from app.core.config import settings
from app.tools.product_tools import search_products
from app.tools.order_tools import get_order_details, cancel_order, place_order
from app.tools.support_tools import submit_complaint
from app.tools.faq_tools import get_company_faq


class AgentFactory:
    def __init__(self):
        # Worker LLM — used by all three specialist agents
        self.worker_llm = LLM(
            model=settings.WORKER_MODEL,
            api_key=settings.GOOGLE_API_KEY,
            temperature=0.1
        )
        
        # Shared context to keep agents on-brand
        self.brand_context = (
            "You are an employee of Luxe, a premium retail brand specializing in "
            "Home & Garden, Electronics, Clothing, and Sports equipment. "
            "You ONLY handle Luxe-related queries. NEVER provide information about "
            "cars, real estate, medical advice, or other brands. "
            "If a request is unrelated to Luxe, politely decline."
        )
    
    def create_unified_specialist_agent(self):
        return Agent(
            role="Luxe Service Specialist",
            goal="Resolve customer inquiries by retrieving FAQ info, searching products, and managing order status.",
            backstory=(
                f"{self.brand_context} "
                "You are an expert at using tools to find answers and verify order status. "
                "CRITICAL: If a user asks to cancel an order, you MUST retrieve its details using 'get_order_details' first. "
                "If the order is PENDING or PROCESSING, you MUST output exactly 'CONFIRMATION_REQUIRED: [OrderID]' to trigger the confirmation flow. "
                "You do NOT have a tool to cancel orders directly; you MUST use the signal. "
                "CRITICAL: When a user wants to buy a product, follow this 5-step journey: "
                "1. Search products and list them numbered (1, 2, 3...). Ask user to choose one. "
                "2. Once chosen, output 'PLACE_ORDER_SUMMARY: {\"product_name\": \"...\", \"price\": ..., \"imageUrl\": \"...\", \"details\": \"...\"}' to show confirmation buttons with product details. "
                "3. If they confirm (reply 'yes' or click 'Buy'), output 'CHECKOUT_REQUIRED: {\"items\": [...]}' to open the secure checkout form. "
                "4. Collect shipping/payment info via the form (handled by system). "
                "5. Never claim an order is placed yourself; only use signals."
            ),
            tools=[get_company_faq, search_products, get_order_details, cancel_order, place_order, submit_complaint],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=5
        )

    def create_rag_agent(self):
        return Agent(
            role="Data Retrieval Specialist",
            goal="Retrieve factual answers from Luxe FAQ.",
            backstory=(
                f"{self.brand_context} "
                "Use get_company_faq to lookup information. Output ONLY the answer or 'NO_FAQ_RESULT'. No conversing."
            ),
            tools=[get_company_faq],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=3
        )

    def create_order_agent(self):
        return Agent(
            role="Transactional Operations Specialist",
            goal="Manage Luxe order status and handle complaints.",
            backstory=(
                f"{self.brand_context} "
                "Use tools to verify order status. "
                "CRITICAL: If a user asks to cancel an order, retrieve details first. If eligible, return 'CONFIRMATION_REQUIRED: [OrderID]'. "
                "You do NOT have a tool to cancel orders directly. "
                "CRITICAL: When a user wants to buy a product, follow this 5-step journey: "
                "1. Search products and list them numbered (1, 2, 3...). Ask user to choose one. "
                "2. Once chosen, output 'PLACE_ORDER_SUMMARY: {\"product_name\": \"...\", \"price\": ..., \"imageUrl\": \"...\", \"details\": \"...\"}' to show confirmation buttons with product details. "
                "3. If they confirm (reply 'yes' or click 'Buy'), output 'CHECKOUT_REQUIRED: {\"items\": [...]}' to open the secure checkout form. "
                "4. Collect shipping/payment info via the form (handled by system). "
                "5. Never claim an order is placed yourself; only use signals."
                "CRITICAL: Product IDs are NOT Order IDs."
            ),
            tools=[get_company_faq, search_products, get_order_details, cancel_order, place_order, submit_complaint],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=5
        )

    def create_response_agent(self):
        return Agent(
            role="Customer Experience Specialist",
            goal="Write final reply based on context. Never invent facts and stay within Luxe scope.",
            backstory=(
                f"{self.brand_context} "
                "Write concise, warm reply based on gathered info. Ignore 'NOT_APPLICABLE' or 'NO_FAQ_RESULT'. "
                "CRITICAL: If the Specialist provided a real Order ID or Reference ID from a tool call (like get_order_details or submit_complaint), you MUST include it. "
                "NEVER invent an Order ID. NEVER misidentify a Product ID (from search_products) as an Order ID. "
                "If no order exists yet, do NOT mention an Order ID. "
                "CRITICAL: If the user asked to cancel an order, you MUST NOT say it was cancelled. The system handles cancellation via confirmation boxes. If the specialist did not confirm cancellation, you must say 'We need to verify your details' or 'I need more information'."
                "CRITICAL: If the specialist reports an ERROR from a tool, you MUST convey that error to the user. DO NOT rephrase an error as a success. NEVER say 'successfully processed' or 'added to order' unless you see a successful tool result or a signal. If the specialist only asked a question, just relay that question.\n"
                "CRITICAL: If the specialist provided a signal (e.g., YES_NO_REQUIRED: ..., CHECKOUT_REQUIRED: ..., CONFIRMATION_REQUIRED: ...), you MUST include that signal EXACTLY at the very end of your response. Do NOT rephrase or omit signals.\n"
                "Output only final text. End with offer to help, unless asking for confirmation."
            ),
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=2
        )

    def create_router_agent(self):
        return Agent(
            role="Traffic Controller",
            goal="Categorize request into intent bucket. Identify out-of-scope requests.",
            backstory=(
                f"{self.brand_context} "
                "Categorize user message into exactly one: GREETING, ORDER, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID. "
                "If the message is about cars, medical advice, or anything NOT related to Luxe products/services, categorize it as INVALID. "
                "Output only the category."
            ),
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1
        )
