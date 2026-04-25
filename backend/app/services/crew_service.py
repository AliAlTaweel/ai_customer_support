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
        
        # Format recent history as a readable string (last 4 turns)
        history_str = "\n".join(history[-4:]) if history else "No previous conversation."

        # ── Step 1: Routing ────────────────────────────────────────────────
        router_task = Task(
            description=(
                f"Conversation history:\n{history_str}\n"
                f"Classify the customer's latest message: '{user_message}'"
            ),
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
                "   - The initial request to cancel is NEVER a confirmation. If the assistant has not yet asked for confirmation, return exactly: 'CONFIRMATION_REQUIRED: [Order ID]'.\n"
                "   - If the assistant ALREADY asked for confirmation in the history, AND the user just confirmed (e.g., 'yes'), use the cancel_order tool.\n"
                "2. For other actions (search, track): use the appropriate tool.\n"
                "3. If no action needed: return 'NOT_APPLICABLE'."
            ),
                expected_output="Database result, 'CONFIRMATION_REQUIRED', or 'NOT_APPLICABLE'.",
                agent=order_specialist
            )
            tasks.append(order_task)
            context.append(order_task)

        # ── Step 4: Run Info Gathering Crew ───────────────────────────────
        usage = {}
        if tasks:
            # Only include agents that have tasks
            gather_agents = []
            if any(x in intent for x in ["KNOWLEDGE", "COMPLEX"]):
                gather_agents.append(rag_specialist)
            if any(x in intent for x in ["ORDER", "COMPLEX"]):
                gather_agents.append(order_specialist)
                
            gather_crew = Crew(
                agents=gather_agents,
                tasks=tasks,
                process=Process.sequential,
                verbose=True,
                memory=False
            )
            
            gather_result = gather_crew.kickoff()
            raw_output = str(gather_result).strip()
            
            if hasattr(gather_result, "token_usage"):
                usage = {
                    "total_tokens": getattr(gather_result.token_usage, "total_tokens", 0),
                    "prompt_tokens": getattr(gather_result.token_usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(gather_result.token_usage, "completion_tokens", 0),
                }

            # Fast-path check for deterministic responses to bypass final LLM response
            if "CONFIRMATION_REQUIRED:" in raw_output:
                order_id = raw_output.split("CONFIRMATION_REQUIRED:")[-1].strip()
                final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
                return {"result": final_message, "usage": usage}
            
            if "has been successfully cancelled" in raw_output.lower() or "successfully canceled" in raw_output.lower():
                # E.g. "Order 123... has been successfully cancelled."
                return {"result": raw_output, "usage": usage}
        else:
            raw_output = "No specific action needed."

        # ── Step 5: Run Final Response Crew ───────────────────────────────
        response_task = Task(
            description=(
                f"{user_info}"
                f"Conversation so far:\n{history_str}\n\n"
                f"Customer message: '{user_message}'\n\n"
                f"Information gathered by specialists:\n{raw_output}\n\n"
                "Write a warm, professional reply based on the gathered info."
            ),
            expected_output="A single, clean, customer-facing reply (2-4 sentences).",
            agent=response_specialist
        )

        response_crew = Crew(
            agents=[response_specialist],
            tasks=[response_task],
            process=Process.sequential,
            verbose=True,
            memory=False
        )

        response_result = response_crew.kickoff()
        final_message = str(response_result).strip()

        # Post-processing
        for sentinel in ["NOT_APPLICABLE", "NO_FAQ_RESULT"]:
            final_message = final_message.replace(sentinel, "").strip()
        final_message = re.sub(r"(Final Answer:|Final Response:|Agent Output:|Response from \w[\w ]*:)", "", final_message, flags=re.IGNORECASE).strip()
        final_message = re.sub(r"\n{3,}", "\n\n", final_message).strip()

        if not final_message or len(final_message) < 10:
            final_message = "I'm sorry, I wasn't able to find a specific answer. How else can I help?"

        # Accumulate token usage
        if hasattr(response_result, "token_usage"):
            usage["total_tokens"] = usage.get("total_tokens", 0) + getattr(response_result.token_usage, "total_tokens", 0)
            usage["prompt_tokens"] = usage.get("prompt_tokens", 0) + getattr(response_result.token_usage, "prompt_tokens", 0)
            usage["completion_tokens"] = usage.get("completion_tokens", 0) + getattr(response_result.token_usage, "completion_tokens", 0)

        return {"result": final_message, "usage": usage}

    def get_greeting(self, first_name: str) -> Dict[str, Any]:
        # Optimization: Return a static greeting instead of spinning up a full CrewAI agent.
        # This reduces token usage from ~700 to 0 and eliminates LLM latency.
        greeting = (
            f"Hello {first_name}, welcome to Luxe. As your dedicated assistant, I can help you with "
            "everything from product discovery and tracking your order to clarifying our company policies. "
            "Is there anything I can assist you with today?"
        )
        
        return {
            "result": greeting,
            "usage": {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
        }
