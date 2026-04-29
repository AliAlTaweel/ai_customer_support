import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import chat
from app.core.config import settings
from app.models.chat import HealthResponse

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup: pre-warm FAQ vector store ─────────────────────────────────
    # This loads the HuggingFace embedding model (~11s) once at boot so the
    # first real user request is not penalised by the cold start.
    try:
        from app.tools.faq_tools import get_vector_store
        logger.info("Pre-warming FAQ vector store...")
        get_vector_store()
        logger.info("FAQ vector store ready.")
    except Exception as e:
        logger.warning(f"Could not pre-warm FAQ vector store: {e}")
    yield
    # ── Shutdown (nothing to clean up) ─────────────────────────────────────


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["chat"])


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    return {
        "status": "healthy",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    logger.info(f"Starting {settings.PROJECT_NAME} on port {settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
