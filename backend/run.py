import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=True,
        reload_excludes=["*.log", "*.db", "*.db-journal", "logs/*", "faq_index/*"]
    )
