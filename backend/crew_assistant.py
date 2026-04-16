from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool
import os

from tools import get_order_status, get_customer_info, search_products

# 1. Setup the Local LLM (Ollama)
llm = LLM(
    model="ollama/llama3.1:8b",
    base_url="http://localhost:11434",
    temperature=0
)

# 2. Bridge RAG into a CrewAI Tool
@tool
def search_company_faq(query: str) -> str:
    """Ideal for answering questions about return policies, shipping, services, and general FAQs."""
    from langchain_ollama import OllamaEmbeddings, ChatOllama
    from langchain_community.vectorstores import Chroma
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_classic.chains import create_retrieval_chain
    from langchain_classic.chains.combine_documents import create_stuff_documents_chain

    # Path to vector store
    db_path = "db/vector_store"
    
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    llm_instance = ChatOllama(model="llama3.1:8b", temperature=0)
    
    vector_store = Chroma(
        persist_directory=db_path,
        embedding_function=embeddings,
        collection_name="faq_collection"
    )
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
    system_prompt = (
        "You are a professional Customer Support Specialist. "
        "Only answer questions related to orders, products, and policies. "
        "Use the following pieces of retrieved context to answer. {context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm_instance, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    response = rag_chain.invoke({"input": query})
    return response["answer"]

class SupportCrew:
    def __init__(self, first_name: str = None):
        self.first_name = first_name
        self.name_context = f"The user is named {first_name}." if first_name else "The user is anonymous."

    def get_crew(self) -> Crew:
        # Agent 1: The Policy Expert
        policy_agent = Agent(
            role="Policy Support Specialist",
            goal=f"Provide accurate, professional answers about company rules and policies. {self.name_context}",
            backstory="""You are the ultimate authority on our FAQ and policies. You provide clear, 
            concise, and friendly answers. If a query requires searching for specific orders or 
            products, you collaborate with the Data Manager.""",
            tools=[search_company_faq],
            llm=llm,
            verbose=True,
            allow_delegation=True
        )

        # Agent 2: The Data Manager
        data_agent = Agent(
            role="Order & Catalog Manager",
            goal="Fetch specific data about orders, customers, and products from the database.",
            backstory="""You are the gatekeeper of our SQL database. You handle order status inquiries, 
            customer profile lookups, and product catalog searches. You provide raw facts and figures.""",
            tools=[get_order_status, get_customer_info, search_products],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        # Main Task
        task_respond = Task(
            description=f"""Process the user query: '{{query}}'. 
            1. You MUST use the 'search_company_faq' tool to check for policy rules.
            2. You MUST delegate to the 'Order & Catalog Manager' if the query is about specific orders (like order ID 3) or product info.
            3. Combine the findings into a final response. Do NOT guess or hallucinate data; only use tool results.""",
            expected_output="A definitive answer based on tool outputs. If tools return 'not found', report that to the user.",
            agent=policy_agent
        )

        return Crew(
            agents=[policy_agent, data_agent],
            tasks=[task_respond],
            process=Process.sequential,
            verbose=True
        )

    def run(self, query: str) -> str:
        crew = self.get_crew()
        result = crew.kickoff(inputs={"query": query})
        return str(result)

if __name__ == "__main__":
    # Test cases
    manager = SupportCrew(first_name="Ali")
    print("\n--- TEST: FAQ + Order Status ---")
    print(manager.run("What is the status of my order 3 and what is your refund policy?"))
