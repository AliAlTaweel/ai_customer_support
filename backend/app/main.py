import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import chat, analytics
from app.services.telemetry_service import TelemetryService
from app.core.config import settings
from app.models.chat import HealthResponse

from app.core.logger import setup_logging

# Configure Logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup Phase ───────────────────────────────────────────────────────
    try:
        # 1. Verify Telemetry Architecture Table Readiness
        TelemetryService.ensure_table()

        # 2. Pre-warm FAQ Vector Store
        from app.tools.faq_tools import get_vector_store
        logger.info("Pre-warming FAQ vector store...")
        get_vector_store()
        logger.info("FAQ vector store ready.")
        
        # 3. GDPR retention
        from app.tools.chat_history import purge_old_messages_fn
        deleted_count = purge_old_messages_fn(days=settings.DATA_RETENTION_DAYS if hasattr(settings, "DATA_RETENTION_DAYS") else 30)
        if deleted_count > 0:
            logger.info(f"GDPR Purge: Removed {deleted_count} old chat messages.")
    except Exception as e:
        logger.warning(f"Could not complete startup tasks: {e}")
    yield


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
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["analytics"])


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    return {
        "status": "healthy",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    logger.info(f"Starting {settings.PROJECT_NAME} on port {settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
