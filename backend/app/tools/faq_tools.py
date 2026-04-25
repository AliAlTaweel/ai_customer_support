import os
import json
import logging
from crewai.tools import tool
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

_vector_store = None

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        try:
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            
            if os.path.exists(settings.INDEX_SAVE_PATH):
                _vector_store = FAISS.load_local(
                    settings.INDEX_SAVE_PATH, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
            else:
                if not os.path.exists(settings.FAQ_DATA_PATH):
                    logger.error(f"FAQ data file not found at {settings.FAQ_DATA_PATH}")
                    return None
                    
                with open(settings.FAQ_DATA_PATH, 'r') as f:
                    faq_data = json.load(f)
                
                texts = [f"Question: {item['question']}\nAnswer: {item['answer']}" for item in faq_data]
                _vector_store = FAISS.from_texts(texts, embeddings)
                _vector_store.save_local(settings.INDEX_SAVE_PATH)
                
        except Exception as e:
            logger.error(f"Error initializing FAQ vector store: {e}")
            return None
    return _vector_store

def get_company_faq_fn(question: str):
    """Retrieve general company information, shipping policies, and return policies using RAG."""
    vs = get_vector_store()
    if vs is None:
        return "I'm sorry, I'm having trouble accessing the company policy database right now."
        
    try:
        results = vs.similarity_search(question, k=2)
        if not results:
            return "I couldn't find any specific information regarding your question in our company policy."
            
        formatted_results = []
        for i, r in enumerate(results, 1):
            formatted_results.append(f"--- KNOWLEDGE SOURCE {i} ---\n{r.page_content}")
            
        return "\n\n".join(formatted_results)
    except Exception as e:
        logger.error(f"Error searching FAQ: {e}")
        return "Error searching company policies."

@tool("get_company_faq")
def get_company_faq(question: str):
    """Retrieve general company information, shipping policies, and return policies using RAG."""
    return get_company_faq_fn(question)
