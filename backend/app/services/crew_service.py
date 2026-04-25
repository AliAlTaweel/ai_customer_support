from crewai import Crew, Process, Task
from app.agents.factory import AgentFactory
from typing import List, Dict, Any
import re


class CrewService:
    def __init__(self):
        self.agent_factory = AgentFactory()

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None) -> Dict[str, Any]:
        user_info = f"Customer Name: {user_name}\n" if user_name else ""
        
        # ── Fast Track: Regex check for extremely simple greetings ──────────
        clean_msg = user_message.lower().strip().strip('?!.')
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            return self.get_greeting(user_name or "there")

        # Instantiate agents
        router_agent = self.agent_factory.create_router_agent()
        
        # ── Step 1: Routing ────────────────────────────────────────────────
        router_task = Task(
            description=f"Classify this message: '{user_message}'",
            expected_output="Exactly one of: GREETING, ORDER, KNOWLEDGE, COMPLEX",
            agent=router_agent
        )
        
        router_crew = Crew(agents=[router_agent], tasks=[router_task], verbose=False)
        intent_result = router_crew.kickoff()
        intent = str(intent_result).strip().upper()

        # ── Step 2: Handle Simple Greeting Intent ─────────────────────────
        if "GREETING" in intent and "ORDER" not in intent and "KNOWLEDGE" not in intent:
            return self.get_greeting(user_name or "there")

        # ── Step 3: Setup Specialists ─────────────────────────────────────
        rag_specialist = self.agent_factory.create_rag_agent()
        order_specialist = self.agent_factory.create_order_agent()
        response_specialist = self.agent_factory.create_response_agent()

        # Format recent history as a readable string (last 4 turns)
        history_str = "\n".join(history[-4:]) if history else "No previous conversation."

        tasks = []
        context = []

        # Only add RAG task if it's KNOWLEDGE or COMPLEX
        if any(x in intent for x in ["KNOWLEDGE", "COMPLEX"]):
            rag_task = Task(
                description=(
                    f"{user_info}"
                    f"Customer message: '{user_message}'\n\n"
                    "Search the company FAQ for information relevant to this message. "
                    "You MUST call the get_company_faq tool with the customer's question as the argument. "
                    "Return ONLY the exact answer text from the FAQ. "
                    "If nothing relevant is found, return exactly: 'NO_FAQ_RESULT'."
                ),
                expected_output="The exact FAQ answer text or 'NO_FAQ_RESULT'.",
                agent=rag_specialist
            )
            tasks.append(rag_task)
            context.append(rag_task)

        # Only add Order task if it's ORDER or COMPLEX
        if any(x in intent for x in ["ORDER", "COMPLEX"]):
            order_task = Task(
                description=(
                    f"{user_info}"
                    f"Conversation history:\n{history_str}\n"
                    f"Customer message: '{user_message}'\n\n"
                    "1. If the user wants to CANCEL an order: Check the history. "
                    "   - If they have NOT confirmed yet, return: 'CONFIRMATION_REQUIRED: [Order ID]'.\n"
                    "   - If they confirmed, find the Order ID and use the cancel_order tool.\n"
                    "2. For other actions (search, track): use the appropriate tool.\n"
                    "3. If no action needed: return 'NOT_APPLICABLE'."
                ),
                expected_output="Database result, 'CONFIRMATION_REQUIRED', or 'NOT_APPLICABLE'.",
                agent=order_specialist
            )
            tasks.append(order_task)
            context.append(order_task)

        # Final Response Task
        response_task = Task(
            description=(
                f"{user_info}"
                f"Conversation so far:\n{history_str}\n\n"
                f"Customer message: '{user_message}'\n\n"
                "Write a warm, professional reply based on the gathered info."
            ),
            expected_output="A single, clean, customer-facing reply (2-4 sentences).",
            agent=response_specialist,
            context=context
        )
        tasks.append(response_task)

        # ── Step 4: Run Optimized Crew ────────────────────────────────────
        crew = Crew(
            agents=[rag_specialist, order_specialist, response_specialist],
            tasks=tasks,
            process=Process.sequential,
            verbose=True,
            memory=False
        )

        result = crew.kickoff()
        final_message = str(result).strip()

        # Post-processing
        for sentinel in ["NOT_APPLICABLE", "NO_FAQ_RESULT"]:
            final_message = final_message.replace(sentinel, "").strip()
        final_message = re.sub(r"(Final Answer:|Final Response:|Agent Output:|Response from \w[\w ]*:)", "", final_message, flags=re.IGNORECASE).strip()
        final_message = re.sub(r"\n{3,}", "\n\n", final_message).strip()

        if not final_message or len(final_message) < 10:
            final_message = "I'm sorry, I wasn't able to find a specific answer. How else can I help?"

        # Token usage
        usage = {}
        if hasattr(result, "token_usage"):
            usage = {
                "total_tokens": result.token_usage.total_tokens,
                "prompt_tokens": result.token_usage.prompt_tokens,
                "completion_tokens": result.token_usage.completion_tokens,
            }

        return {"result": final_message, "usage": usage}

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        assistant = self.agent_factory.create_response_agent()
        greeting_task = Task(
            description=(
                f"Generate a warm, professional welcome message for a customer named {first_name}. "
                "Mention that you are the Luxe Assistant team and you can help with product discovery, "
                "order tracking, and company policies. Keep it brief and friendly."
            ),
            expected_output="A short, friendly welcome message (1-2 sentences).",
            agent=assistant
        )

        crew = Crew(
            agents=[assistant],
            tasks=[greeting_task],
            verbose=False,
            memory=False
        )

        result = crew.kickoff()

        usage = {}
        if hasattr(result, "token_usage"):
            usage = {
                "total_tokens": result.token_usage.total_tokens,
                "prompt_tokens": result.token_usage.prompt_tokens,
                "completion_tokens": result.token_usage.completion_tokens,
                "successful_requests": result.token_usage.successful_requests,
            }

        return {"result": str(result), "usage": usage}
