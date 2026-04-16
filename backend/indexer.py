import json
import os
from typing import List, Dict
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

class KnowledgeIndexer:
    def __init__(self, 
                 source_path: str = "../FAQ/faq.json", 
                 db_path: str = "../db/vector_store",
                 embedding_model: str = "nomic-embed-text"):
        self.source_path = source_path
        self.db_path = db_path
        self.embedding_model = embedding_model
        
        # Initialize embeddings
        self.embeddings = OllamaEmbeddings(model=self.embedding_model)
        
    def load_faq_data(self) -> List[Dict]:
        """Loads the FAQ JSON file."""
        if not os.path.exists(self.source_path):
            raise FileNotFoundError(f"Source file not found: {self.source_path}")
            
        with open(self.source_path, 'r') as f:
            return json.load(f)

    def process_into_documents(self, data: List[Dict]) -> List[Document]:
        """Transforms JSON entries into LangChain Documents."""
        documents = []
        for entry in data:
            question = entry.get("question", "")
            answer = entry.get("answer", "")
            
            # Formatted text as per rag_indexing.md
            content = f"Question: {question} \n Answer: {answer}"
            
            doc = Document(
                page_content=content,
                metadata={"question": question, "source": "faq.json"}
            )
            documents.append(doc)
        return documents

    def run_indexing(self):
        """Executes the full indexing procedure."""
        print(f"Loading data from {self.source_path}...")
        data = self.load_faq_data()
        
        print(f"Processing {len(data)} entries...")
        documents = self.process_into_documents(data)
        
        print(f"Initializing ChromaDB at {self.db_path}...")
        # Chroma handles persistence automatically to the given directory
        vector_store = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.db_path,
            collection_name="faq_collection"
        )
        
        print("Indexing completed successfully.")
        return {"status": "success", "count": len(documents)}

if __name__ == "__main__":
    # Test execution
    indexer = KnowledgeIndexer()
    try:
        result = indexer.run_indexing()
        print(result)
    except Exception as e:
        print(f"Error during indexing: {e}")
