from crewai import Task


class TaskFactory:
    @staticmethod
    def create_router_task(agent, user_message: str) -> Task:
        """Task to classify the user's intent. History is intentionally excluded to save tokens."""
        return Task(
            description=(
                f"Customer message: '{user_message}'\n\n"
                "Luxe is a retail brand for Home, Electronics, Clothing, and Sports. "
                "Classify the customer's message into exactly one: GREETING, ORDER, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID. "
                "CRITICAL: If the message is about unrelated topics (cars, medical, etc.), return INVALID."
            ),
            expected_output="Exactly one of: GREETING, ORDER, KNOWLEDGE, COMPLAINT, COMPLEX, INVALID",
            agent=agent
        )

    @staticmethod
    def create_rag_task(agent, user_message: str) -> Task:
        """Task to retrieve information from the FAQ. user_info excluded — agent only needs the question."""
        return Task(
            description=(
                f"Customer message: '{user_message}'\n\n"
                "Search the company FAQ for information relevant to this message. "
                "You MUST call the get_company_faq tool with the customer's question as the argument. "
                "Return ONLY the exact answer text from the FAQ. "
                "If nothing relevant is found, return exactly: 'NO_FAQ_RESULT'."
            ),
            expected_output="The exact FAQ answer text or 'NO_FAQ_RESULT'.",
            agent=agent
        )

    @staticmethod
    def create_order_task(agent, user_message: str, history_str: str, user_info: str, mission: str = "") -> Task:
        """Task to handle order-related operations using signals and tools."""
        return Task(
            description=(
                f"{user_info}\n"
                f"History:\n{history_str}\n\n"
                f"Message: '{user_message}'\n\n"
                f"YOUR MISSION:\n{mission if mission else 'Resolve the customer inquiry using available tools.'}\n\n"
                "CRITICAL: If 'Customer Email' is '[AUTH_EMAIL]', you MUST pass this literal string '[AUTH_EMAIL]' to tool parameters.\n"
                "CRITICAL: NEVER claim an order is placed or cancelled. Your job is ONLY to trigger signals.\n"
                "CRITICAL: NEVER invent IDs. Use only what tools provide."
            ),
            expected_output="Tool result, PLACE_ORDER_SUMMARY, CHECKOUT_REQUIRED, CONFIRMATION_REQUIRED, or a direct answer.",
            agent=agent
        )

    @staticmethod
    def create_response_task(agent, user_message: str, history_str: str, user_info: str, raw_output: str) -> Task:
        """Task to generate the final customer-facing response."""
        return Task(
            description=(
                f"{user_info}"
                f"Conversation so far:\n{history_str}\n\n"
                f"Customer message: '{user_message}'\n\n"
                f"Information gathered by specialists:\n{raw_output}\n\n"
                "Write a warm, professional reply based on the gathered info. "
                "CRITICAL: If the specialists have NOT provided a real Order ID or Reference ID from a tool, DO NOT invent one and DO NOT say the order was placed. "
                "NEVER misidentify a Product ID (from a product search) as an Order ID. "
                "If info is missing, ask for it."
            ),
            expected_output="A single, clean, customer-facing reply (2-4 sentences).",
            agent=agent
        )
