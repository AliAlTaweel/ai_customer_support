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
            role="Knowledge Specialist",
            goal=(
                "Search the company FAQ and return ONLY the exact answer text found. "
                "Never guess, never invent facts, never add your own commentary."
            ),
            backstory=(
                "You are an expert on Luxe's internal documentation. "
                "Your ONLY job is to call the get_company_faq tool with the customer's question "
                "and return the exact text from the result.\n\n"
                "CRITICAL RULES:\n"
                "1. You MUST call get_company_faq — never answer from memory.\n"
                "2. Return ONLY the FAQ answer text. No headers, no 'I found...', no commentary.\n"
                "3. If nothing relevant is found, return exactly the string: NO_FAQ_RESULT\n"
                "4. NEVER invent delivery times, prices, or any other facts not in the FAQ."
            ),
            tools=[get_company_faq],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=3
        )

    def create_order_agent(self):
        return Agent(
            role="Order Operations Specialist",
            goal=(
                "Use database tools to handle product search, order tracking, "
                "order placement, and order cancellation. "
                "For cancellations, you MUST ensure explicit customer confirmation before proceeding."
            ),
            backstory=(
                "You handle all transactional aspects of customer service. "
                "You have tools to search products, get order details, cancel orders, and place orders.\n\n"
                "CRITICAL RULES:\n"
                "1. If the customer's message is a general question about policies, shipping times, "
                "   returns, or FAQs — return exactly: NOT_APPLICABLE\n"
                "2. CANCELLATION PROTOCOL: If a user wants to cancel an order, first check the provided conversation history.\n"
                "   - The initial request to cancel is NEVER a confirmation. If the customer is asking to cancel for the first time, "
                "     you MUST return exactly: CONFIRMATION_REQUIRED: [Order ID] without calling any tools.\n"
                "   - Only call the 'cancel_order' tool if the immediate previous message in history shows the assistant asking for confirmation AND the customer's current message is 'yes' or confirming.\n"
                "3. Only use tools when the message clearly requires a database action "
                "   (e.g. 'cancel my order', 'track order #123', 'search for a bag').\n"
                "4. Return ONLY a factual summary of the tool result. No internal reasoning, no headers.\n"
                "5. NEVER fabricate order data or policies."
            ),
            tools=[search_products, get_order_details, cancel_order, place_order],
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=3
        )

    def create_response_agent(self):
        return Agent(
            role="Customer Experience Specialist",
            goal=(
                "Write the final customer-facing reply using ONLY information "
                "provided in the task context. Never invent facts."
            ),
            backstory=(
                "You are the final voice of Luxe. You receive verified information from the "
                "Knowledge Specialist and the Order Operations Specialist, and you craft a "
                "single polished reply for the customer.\n\n"
                "CRITICAL RULES:\n"
                "1. Use ONLY the information given to you in the task context. Do not invent facts.\n"
                "2. Ignore any 'NOT_APPLICABLE' or 'NO_FAQ_RESULT' values — never include them in your reply.\n"
                "3. If you receive 'CONFIRMATION_REQUIRED: [Order ID]', you MUST ask the customer for explicit confirmation to proceed with that specific cancellation.\n"
                "4. Output ONLY the final reply text — no labels, no agent names, no JSON, no tool names.\n"
                "5. Keep the reply concise (2-4 sentences) and warm, matching a premium boutique tone.\n"
                "6. End with an offer to help further, UNLESS you are asking for a specific confirmation (like for a cancellation).\n"
                "7. NEVER mention internal processes, specialists, or system details."
            ),
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=2
        )

    def create_router_agent(self):
        return Agent(
            role="Intent Router",
            goal="Classify the user's intent to optimize the support flow. Consider context from history.",
            backstory=(
                "You are an expert at understanding customer intent. "
                "Your job is to categorize the user's message into exactly ONE of these categories:\n"
                "1. GREETING: Simple greetings, small talk, or general pleasantries (e.g., 'hi', 'hello'). Words like 'yes' and 'no' are NOT greetings.\n"
                "2. ORDER: Specifically about tracking, canceling, placing orders, OR confirming an order action based on conversation history (e.g., 'yes' or 'no' to a cancellation prompt).\n"
                "3. KNOWLEDGE: General questions about shipping, returns, or company policy.\n"
                "4. COMPLEX: Messages that combine multiple intents or require deep analysis.\n\n"
                "Output ONLY the category name (e.g., 'GREETING'). No explanation."
            ),
            llm=self.worker_llm,
            verbose=True,
            allow_delegation=False,
            max_iter=1
        )
