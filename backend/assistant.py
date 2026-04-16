from crew_assistant import SupportCrew

class AgenticAssistant:
    def __init__(self, 
                 db_path: str = "db/vector_store",
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
        from langchain_classic.chains import create_retrieval_chain
        from langchain_classic.chains.combine_documents import create_stuff_documents_chain

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
        """The entry point that now invokes the CrewAI multi-agent team."""
        crew_manager = SupportCrew(first_name=first_name)
        # Simply delegate the entire query resolution to the Crew
        return crew_manager.run(query)

if __name__ == "__main__":
    assistant = AgenticAssistant()
    print(assistant.ask("What is your return policy?"))
