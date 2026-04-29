from crewai import Agent, LLM
from app.core.config import settings
from app.tools.database_tools import search_products, get_order_details, cancel_order, place_order, submit_complaint
from app.tools.faq_tools import get_company_faq


class AgentFactory:
    def __init__(self):
        # Worker LLM — used by all three specialist agents
        self.worker_llm = LLM(
            model=settings.WORKER_MODEL,
            api_key=settings.GOOGLE_API_KEY,
            temperature=1.0
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
                "CRITICAL: When a user wants to place a new order, you MUST collect: Full Name, Shipping Address, and Items. "
                "You MUST also include the customer's email. If they are authenticated (VERIFIED), use the email provided in the prompt. "
                "Once you have all details, output 'PLACE_ORDER_SUMMARY: [human-readable summary]' and 'PLACE_ORDER_DETAILS: [JSON]' then STOP. "
                "The JSON MUST include keys: customer_email, customer_name, shipping_address, items (list of {product_name, quantity}). "
                "You do NOT have a tool to place orders directly; the system will handle it once you output the summary and the user confirms. "
                "If the user is complaining, collect details and use 'submit_complaint'. "
                "CRITICAL: NEVER claim success for an action (placement/cancellation) unless the system (not you) has processed it. Your job for orders is ONLY to verify status and generate signals."
            ),
            tools=[get_company_faq, search_products, get_order_details, submit_complaint],
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
                "CRITICAL: When placing a new order, you MUST collect: Full Name, Shipping Address, and the list of Items. "
                "Once you have ALL details, you MUST output 'PLACE_ORDER_SUMMARY: [human-readable summary]' and 'PLACE_ORDER_DETAILS: [JSON]' and STOP. "
                "You do NOT have a tool to place orders directly. "
                "If the user is complaining, use the 'submit_complaint' tool after gathering details."
            ),
            tools=[search_products, get_order_details, submit_complaint],
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
                "CRITICAL: If the user asked to cancel an order, you MUST NOT say it was cancelled. The system handles cancellation via confirmation boxes. If the specialist did not confirm cancellation, you must say 'We need to verify your details' or 'I need more information'."
                "CRITICAL: If the specialist reports an ERROR from a tool, you MUST convey that error to the user. DO NOT rephrase an error as a success. NEVER say 'successfully processed' unless explicitly stated by the tool."
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
