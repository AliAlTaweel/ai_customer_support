from crewai import Agent, LLM
from app.core.config import settings
from app.tools.database_tools import search_products, get_order_details, cancel_order, place_order
from app.tools.faq_tools import get_company_faq


class AgentFactory:
    def __init__(self):
        # Worker LLM — used by all three specialist agents
        self.worker_llm = LLM(
            model=settings.WORKER_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            api_key=""
        )

    def create_rag_agent(self):
        return Agent(
            role="Data Retrieval Specialist",
            goal="Retrieve factual answers from FAQ.",
            backstory="Use get_company_faq to lookup information. Output ONLY the answer or 'NO_FAQ_RESULT'. No conversing.",
            tools=[get_company_faq],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=3
        )

    def create_order_agent(self):
        return Agent(
            role="Transactional Operations Specialist",
            goal="Execute DB operations for orders/products.",
            backstory=(
                "Use tools to interact with DB. Provide raw summaries. "
                "CRITICAL: If cancelling an order, return 'CONFIRMATION_REQUIRED: [OrderID]' unless user already confirmed. "
                "CRITICAL: When placing a new order, you MUST collect: Full Name, Shipping Address, and the list of Items. "
                "Before calling 'place_order', you MUST present a summary of the order to the user and wait for their explicit 'Yes' or 'Confirm'. "
                "If confirmation is missing for a NEW order, output a summary and ask for confirmation. "
                "Use the verified user context (email/name) from the prompt whenever possible."
            ),
            tools=[search_products, get_order_details, cancel_order, place_order],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=5
        )

    def create_response_agent(self):
        return Agent(
            role="Customer Experience Specialist",
            goal="Write final reply based on context. Never invent facts.",
            backstory="Write concise, warm reply based on gathered info. Ignore 'NOT_APPLICABLE' or 'NO_FAQ_RESULT'. Output only final text. End with offer to help, unless asking for confirmation.",
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=2
        )

    def create_router_agent(self):
        return Agent(
            role="Traffic Controller",
            goal="Categorize request into intent bucket.",
            backstory="Categorize user message into exactly one: GREETING, ORDER, KNOWLEDGE, COMPLEX, INVALID. Output only the category.",
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1
        )
