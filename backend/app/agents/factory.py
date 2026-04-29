from crewai import Agent, LLM
from app.core.config import settings
from app.tools.database_tools import search_products, get_order_details, cancel_order, place_order, submit_complaint
from app.tools.faq_tools import get_company_faq


class AgentFactory:
    def __init__(self):
        # Worker LLM — used by all three specialist agents
        self.worker_llm = LLM(
            model=settings.WORKER_MODEL,
            api_key=settings.GOOGLE_API_KEY
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
            goal="Resolve customer inquiries by retrieving FAQ info, searching products, and managing orders.",
            backstory=(
                f"{self.brand_context} "
                "You are an expert at using tools to find answers and perform actions. "
                "CRITICAL: If cancelling an order, return 'CONFIRMATION_REQUIRED: [OrderID]' unless user already confirmed. "
                "CRITICAL: When placing a new order, you MUST collect: Full Name, Shipping Address, and Items. "
                "You MUST also include the customer's email in the details. If they are authenticated (VERIFIED), use the email provided in the prompt. "
                "Once you have all details, output 'PLACE_ORDER_SUMMARY: [human-readable summary]' and 'PLACE_ORDER_DETAILS: [JSON]' then STOP. "
                "The JSON MUST include keys: customer_email, customer_name, shipping_address, items (list of {product_name, quantity}). "
                "Do NOT call 'place_order' until the user explicitly confirms. "
                "If the user is complaining, collect details and use 'submit_complaint'. "
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
            goal="Execute DB operations for Luxe orders/products or handle complaints.",
            backstory=(
                f"{self.brand_context} "
                "Use tools to interact with DB. Provide raw summaries. "
                "CRITICAL: If cancelling an order, return 'CONFIRMATION_REQUIRED: [OrderID]' unless user already confirmed. "
                "CRITICAL: When placing a new order, you MUST collect: Full Name, Shipping Address, and the list of Items. "
                "Once you have ALL details, you MUST output 'PLACE_ORDER_SUMMARY: [human-readable summary of the order]' and STOP. "
                "Do NOT call the 'place_order' tool until the user explicitly replies 'yes' or 'confirm'. "
                "CRITICAL: When calling 'place_order', you MUST pass the 'user_id' provided in the user_info prompt. "
                "If the user is complaining, frustrated, or asks to speak with a human/admin, you MUST collect the specific message/complaint details first. "
                "Once you have a clear complaint, use the 'submit_complaint' tool. "
                "Use the verified user context (email/name/id) from the prompt whenever possible."
            ),
            tools=[search_products, get_order_details, cancel_order, place_order, submit_complaint],
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
                "CRITICAL: If a tool output contains an 'Order ID' or 'Reference ID', you MUST include that exact ID in your final response. "
                "NEVER invent a Reference ID or Order ID. If the specialist has not provided one, do NOT say the action was successful; instead, report the current status or ask for missing info. "
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
