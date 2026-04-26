from crewai import Task


class TaskFactory:
    @staticmethod
    def create_router_task(agent, user_message: str, history_str: str) -> Task:
        """Task to classify the user's intent."""
        return Task(
            description=(
                f"Conversation history:\n{history_str}\n"
                f"Classify the customer's latest message: '{user_message}'"
            ),
            expected_output="Exactly one of: GREETING, ORDER, KNOWLEDGE, COMPLEX, INVALID",
            agent=agent
        )

    @staticmethod
    def create_rag_task(agent, user_message: str, user_info: str) -> Task:
        """Task to retrieve information from the FAQ."""
        return Task(
            description=(
                f"{user_info}"
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
    def create_order_task(agent, user_message: str, history_str: str, user_info: str) -> Task:
        """Task to handle order-related operations."""
        return Task(
            description=(
                f"{user_info}"
                f"Conversation history:\n{history_str}\n"
                f"Customer message: '{user_message}'\n\n"
                "1. If the user wants to CANCEL an order: Check the history. "
                "   - The initial request to cancel is NEVER a confirmation. If the assistant has not yet asked for confirmation, return exactly: 'CONFIRMATION_REQUIRED: [Order ID]'.\n"
                "   - If the assistant ALREADY asked for confirmation in the history, AND the user just confirmed (e.g., 'yes'), use the cancel_order tool.\n"
                "2. For other actions (search, track): use the appropriate tool.\n"
                "3. If no action needed: return 'NOT_APPLICABLE'."
            ),
            expected_output="Database result, 'CONFIRMATION_REQUIRED', or 'NOT_APPLICABLE'.",
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
                "Write a warm, professional reply based on the gathered info."
            ),
            expected_output="A single, clean, customer-facing reply (2-4 sentences).",
            agent=agent
        )
