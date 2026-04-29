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
    def create_order_task(agent, user_message: str, history_str: str, user_info: str) -> Task:
        """Task to handle order-related operations."""
        return Task(
            description=(
                f"{user_info}"
                f"Conversation history:\n{history_str}\n"
                f"Customer message: '{user_message}'\n\n"
                "1. If the user wants to CANCEL an order: Check history. "
                "   - If not yet asked for confirmation, return exactly: 'CONFIRMATION_REQUIRED: [Order ID]'.\n"
                "   - If already asked and user says 'yes', call cancel_order.\n"
                "2. If the user wants to PLACE an order: \n"
                "   - You MUST have: customer_name, customer_email, shipping_address, and items.\n"
                "   - Use the 'user_info' above for name/email if available. Don't ask again if verified.\n"
                "   - If ANY detail is missing, ask the user for it politely.\n"
                "   - Once you have ALL details:\n"
                "     a) Check if the conversation history already shows the user explicitly confirming THIS order summary.\n"
                "     b) If NOT yet confirmed: output exactly 'PLACE_ORDER_SUMMARY: [clear summary of items, address, total]'. Do NOT call place_order yet.\n"
                "     c) If the user just confirmed (e.g., 'yes', 'confirm', 'do it'), call 'place_order' with all details.\n"
                "3. If the user is COMPLAINING or frustrated: \n"
                "   - Use 'submit_complaint' to record their message for the admin team.\n"
                "   - Try to collect a subject and the main message.\n"
                "4. For other actions (search, track): use the appropriate tool.\n"
                "5. If no action needed: return 'NOT_APPLICABLE'."
            ),
            expected_output="Database result, PLACE_ORDER_SUMMARY, CONFIRMATION_REQUIRED, or 'NOT_APPLICABLE'.",
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
