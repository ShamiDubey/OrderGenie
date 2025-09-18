import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import face, health, recommendations, chat
from app.services.deepface_service import deepface_service
from app.services.database_service import db_service
from app.services.openai_service import openai_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    logger.info("Initializing DeepFace service...")
    deepface_service.initialize()
    logger.info("DeepFace service ready")

    # Initialize database connection for recommendations
    logger.info("Initializing database service...")
    try:
        await db_service.initialize()
        logger.info("Database service ready")
    except Exception as e:
        logger.warning(f"Database service initialization failed: {e}")

    # Initialize OpenAI service
    logger.info("Initializing OpenAI service...")
    try:
        openai_service.initialize()
        logger.info("OpenAI service ready")
    except Exception as e:
        logger.warning(f"OpenAI service initialization failed: {e}")

    yield

    # Cleanup
    logger.info("Shutting down...")
    await db_service.close()


app = FastAPI(
    title="Face Detection Service",
    description="DeepFace-powered face detection and embedding API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(face.router, prefix="/api", tags=["Face Detection"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "AI Order Dashboard - Python Backend",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "face": {
                "detect": "/api/detect",
                "represent": "/api/represent",
                "analyze": "/api/analyze",
                "verify": "/api/verify",
            },
            "recommendations": {
                "analyze": "/api/recommendations/analyze/{profile_id}",
                "generate": "/api/recommendations/generate/{profile_id}",
                "trending": "/api/recommendations/trending",
                "similar": "/api/recommendations/similar/{product_id}",
            },
            "chat": {
                "message": "/api/chat/message",
                "confirm": "/api/chat/confirm",
            },
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
