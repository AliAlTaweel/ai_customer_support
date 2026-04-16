from crew_assistant import SupportCrew

class AgenticAssistant:
    def __init__(self, 
                 db_path: str = "../db/vector_store",
                 embedding_model: str = "nomic-embed-text",
                 llm_model: str = "llama3.1:8b"):
        
        self.db_path = db_path
        # Note: We keep the signature but the logic now shifts to the Crew
        # The db_path and models are handled inside SupportCrew
        
    def _get_faq_answer(self, query: str):
        """Standard RAG lookup (kept for internal tool use by the Crew)."""
        # This is essentially the same as the old IndexingAssistant logic
        # We re-import here to avoid circular imports if crew_assistant imports us
        from langchain_ollama import OllamaEmbeddings, ChatOllama
        from langchain_community.vectorstores import Chroma
        from langchain_core.prompts import ChatPromptTemplate
        from langchain.chains import create_retrieval_chain
        from langchain.chains.combine_documents import create_stuff_documents_chain

        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        llm = ChatOllama(model="llama3.1:8b", temperature=0)
        vector_store = Chroma(
            persist_directory=self.db_path,
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
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        response = rag_chain.invoke({"input": query})
        return response["answer"]

    def ask(self, query: str, first_name: str = None):
        """The entry point that now invokes the Hybrid Gatekeeper logic."""
        from rag_service import RAGService
        from langchain_ollama import ChatOllama
        
        rag = RAGService(db_path=self.db_path)
        
        # 1. Smart Intent Check (Heuristic)
        # We escalate if it looks like a request for specific PRIVATE data
        data_intents = ['status', 'track', 'track my', 'my order', 'order #', 'id', 'account status']
        is_data_query = any(intent in query.lower() for intent in data_intents)
        
        # We stay in Fast RAG if it looks like a general FAQ (Why, How, What, Where)
        faq_starters = ['why', 'how', 'what', 'where', 'is there', 'can i']
        is_faq_style = any(query.lower().startswith(start) for start in faq_starters)
        
        should_check_faq = is_faq_style and not is_data_query

        if should_check_faq:
            # 2. Tier 1: Fast RAG Check
            print(f"[GATEKEEPER] Potential FAQ hit. Running Fast RAG check for: '{query}'")
            context = rag.get_context(query)
            
            # Ask the LLM if the context is enough to answer PROPERLY
            eval_llm = ChatOllama(model="llama3.1:8b", temperature=0)
            eval_msg = (
                f"Context: {context}\n\n"
                f"User Question: {query}\n\n"
                "Does the context above contain a specific and complete answer to the user's question? "
                "Respond with only 'YES' or 'NO'."
            )
            response = eval_llm.invoke(eval_msg)
            is_faq_match = "YES" in str(response.content).upper()

            if is_faq_match:
                print("[GATEKEEPER] FAQ match confirmed. Responding directly.")
                return rag.query_faq(query)

        # 3. Tier 2: Escalation to CrewAI
        print(f"[GATEKEEPER] Escalating to Support Crew for complex reasoning: '{query}'")
        crew_manager = SupportCrew(first_name=first_name)
        return crew_manager.run(query)

if __name__ == "__main__":
    assistant = AgenticAssistant()
    print(assistant.ask("What is your return policy?"))
