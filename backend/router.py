from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

class RouteResponse(BaseModel):
    """Routing classification for the user query."""
    intent: str = Field(description="The classified intent: 'FAQ' for general knowledge, 'ACTION' for transactions/account lookups, or 'OUT_OF_SCOPE' for off-topic requests.")

class IntentRouter:
    def __init__(self, model_name: str = "llama3.1:8b"):
        self.llm = ChatOllama(model=model_name, temperature=0)
        
    def route(self, query: str) -> str:
        """Classifies the user query into FAQ or ACTION."""
        system_prompt = (
            "You are an expert intent classifier for a customer support portal. "
            "Classify the input as:\n"
            "1. 'FAQ': General questions about policies, services, or procedures.\n"
            "2. 'ACTION': Specific queries about an order, profile, or product catalog.\n"
            "3. 'OUT_OF_SCOPE': Requests unrelated to commerce or support (e.g., counting, general trivia, poems, or general chat).\n\n"
            "Return only the label: 'FAQ', 'ACTION', or 'OUT_OF_SCOPE'."
        )
        
        # Simple string-based routing for reliability with smaller models
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({"input": query})
        content = response.content.strip().upper()
        
        if "ACTION" in content:
            return "ACTION"
        if "OUT_OF_SCOPE" in content or "OUT" in content:
            return "OUT_OF_SCOPE"
        return "FAQ"
