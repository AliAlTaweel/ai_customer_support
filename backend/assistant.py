from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

class IndexingAssistant:
    def __init__(self, 
                 db_path: str = "../db/vector_store",
                 embedding_model: str = "nomic-embed-text",
                 llm_model: str = "llama3.1:8b"):
        
        self.db_path = db_path
        self.embeddings = OllamaEmbeddings(model=embedding_model)
        self.llm = ChatOllama(model=llm_model)
        
        # Load the existing vector store
        self.vector_store = Chroma(
            persist_directory=self.db_path,
            embedding_function=self.embeddings,
            collection_name="faq_collection"
        )
        
    def ask(self, query: str, first_name: str = None):
        """Asks the assistant a question about the indexed knowledge base."""
        """Asks the assistant a question about the indexed knowledge base."""
        retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})
        
        name_context = f"The user's name is {first_name}. Address them by name when appropriate. " if first_name else ""
        system_prompt = (
            f"You are an assistant for question-answering tasks. {name_context}"
            "Use the following pieces of retrieved context to answer "
            "the question. If you don't know the answer, say that you "
            "don't know. Use three sentences maximum and keep the "
            "answer concise.\n\n"
            "{context}"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        response = rag_chain.invoke({"input": query})
        return response["answer"]

if __name__ == "__main__":
    assistant = IndexingAssistant()
    try:
        print(assistant.ask("What services do you provide?"))
    except Exception as e:
        print(f"Error: {e}")
