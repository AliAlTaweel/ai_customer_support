from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from indexer import KnowledgeIndexer
from assistant import AgenticAssistant

app = FastAPI(title="Agentic RAG Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    first_name: str = None

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/indexing/run")
async def run_indexing():
    try:
        indexer = KnowledgeIndexer(
            source_path="../FAQ/faq.json",
            db_path="../db/vector_store"
        )
        result = indexer.run_indexing()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/indexing/status")
async def get_indexing_status():
    db_exists = os.path.exists("../db/vector_store")
    return {
        "status": "Ready" if db_exists else "Not Indexed",
        "db_path": "../db/vector_store"
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Note: AgenticAssistant already defaults to ../db/vector_store
        assistant = AgenticAssistant()
        answer = assistant.ask(request.message, first_name=request.first_name)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
