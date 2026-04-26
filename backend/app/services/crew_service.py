from crewai import Crew, Process, Task
from app.agents.factory import AgentFactory
from app.tasks.factory import TaskFactory
from typing import List, Dict, Any
import re


class CrewService:
    def __init__(self):
        self.agent_factory = AgentFactory()

    def kickoff_chat(self, user_message: str, history: List[str], user_name: str = None, state: Dict[str, Any] = None) -> Dict[str, Any]:
        user_info = f"Customer Name: {user_name}\n" if user_name else ""
        state = state or {}
        
        # ── Fast Track: Regex check for extremely simple greetings ──────────
        clean_msg = user_message.lower().strip().strip('?!.')
        
        # 0. Fast Track: Pending Confirmation
        pending_order = state.get("pending_confirmation")
        if pending_order:
            zero_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
            if clean_msg in ["yes", "y", "confirm", "sure"]:
                from app.tools.database_tools import cancel_order_fn
                result = cancel_order_fn(pending_order)
                return {"result": result, "usage": zero_usage, "state_update": {"pending_confirmation": None}}
            elif clean_msg in ["no", "n", "cancel", "stop", "nevermind"]:
                return {"result": "No problem. The order cancellation has been aborted.", "usage": zero_usage, "state_update": {"pending_confirmation": None}}

        # 1. Known simple greetings
        if clean_msg in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
            return self.get_greeting(user_name or "there")

        # 2. Gatekeeper: Catch extremely short or single-character noise
        if len(clean_msg) < 2:
            # We don't call the LLM for single characters like "i"
            return self.get_clarification_response()
            
        # 3. Gatekeeper: Catch known short nonsense or "test" strings (optional, can be expanded)
        if clean_msg in ["test", "bot", "anyone"]:
            return {
                "result": "I'm here and ready to help! Could you please tell me more about what you're looking for?",
                "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
            }

        # Instantiate agents
        router_agent = self.agent_factory.create_router_agent()
        
        # Format recent history as a readable string (last 4 turns)
        history_str = "\n".join(history[-4:]) if history else "No previous conversation."

        # ── Step 1: Routing ────────────────────────────────────────────────
        router_task = TaskFactory.create_router_task(
            agent=router_agent,
            user_message=user_message,
            history_str=history_str
        )
        
        router_crew = Crew(agents=[router_agent], tasks=[router_task], verbose=False)
        intent_result = router_crew.kickoff()
        intent = str(intent_result).strip().upper()

        # ── Step 2: Handle Simple Intent Paths ────────────────────────────
        if "INVALID" in intent:
            return self.get_clarification_response()

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
            rag_task = TaskFactory.create_rag_task(
                agent=rag_specialist,
                user_message=user_message,
                user_info=user_info
            )
            tasks.append(rag_task)
            context.append(rag_task)

        # Only add Order task if it's ORDER or COMPLEX
        if any(x in intent for x in ["ORDER", "COMPLEX"]):
            order_task = TaskFactory.create_order_task(
                agent=order_specialist,
                user_message=user_message,
                history_str=history_str,
                user_info=user_info
            )
            tasks.append(order_task)
            context.append(order_task)

        # ── Step 4: Run Info Gathering Crew ───────────────────────────────
        usage = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "successful_requests": 0,
        }
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
                    "successful_requests": getattr(gather_result.token_usage, "successful_requests", 1)
                }

            # Fast-path check for deterministic responses to bypass final LLM response
            if "CONFIRMATION_REQUIRED:" in raw_output:
                order_id = raw_output.split("CONFIRMATION_REQUIRED:")[-1].strip()
                final_message = f"We can certainly assist you with cancelling order {order_id}. As a final step, we require explicit confirmation before processing this cancellation. Please reply 'yes' to confirm."
                return {"result": final_message, "usage": usage, "state_update": {"pending_confirmation": order_id}}
            
            if "has been successfully cancelled" in raw_output.lower() or "successfully canceled" in raw_output.lower():
                # E.g. "Order 123... has been successfully cancelled."
                return {"result": raw_output, "usage": usage, "state_update": {"pending_confirmation": None}}
        else:
            raw_output = "No specific action needed."

        # ── Step 5: Run Final Response Crew ───────────────────────────────
        response_task = TaskFactory.create_response_task(
            agent=response_specialist,
            user_message=user_message,
            history_str=history_str,
            user_info=user_info,
            raw_output=raw_output
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

    def get_clarification_response(self) -> Dict[str, Any]:
        """Return a static response for very short or ambiguous inputs to save tokens."""
        return {
            "result": "I didn't quite catch that. Could you please provide a bit more detail so I can assist you better?",
            "usage": {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "successful_requests": 0,
            }
        }
