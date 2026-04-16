from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
import os

class RAGService:
    def __init__(self, db_path: str = "../db/vector_store", model: str = "nomic-embed-text"):
        self.db_path = db_path
        self.embeddings = OllamaEmbeddings(model=model)
        self.vector_store = Chroma(
            persist_directory=self.db_path,
            embedding_function=self.embeddings,
            collection_name="faq_collection"
        )
        self.llm = ChatOllama(model="llama3.1:8b", temperature=0)

    def get_context(self, query: str, k: int = 3):
        """Retrieves raw context documents from the vector store."""
        retriever = self.vector_store.as_retriever(search_kwargs={"k": k})
        docs = retriever.invoke(query)
        return "\n".join([d.page_content for d in docs])

    def query_faq(self, query: str):
        """Performs a standard RAG query and returns a synthesized answer."""
        retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})
        
        system_prompt = (
            "You are a professional Customer Support Specialist. "
            "STRICT RULES:\n"
            "1. You MUST ONLY use the provided context to answer the question.\n"
            "2. If the answer is not in the context, say 'I apologize, but I don't have information on that. Please contact support for more details.'\n"
            "3. Do NOT use outside knowledge or make up rules (like time limits or account policies) not found in the text.\n"
            "CONTEXT:\n{context}"
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        response = rag_chain.invoke({"input": query})
        return response["answer"]
