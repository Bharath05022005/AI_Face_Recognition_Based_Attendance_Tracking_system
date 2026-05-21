import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.db import init_db
from app.services.scheduler_service import SchedulerService
from app.services.recognition_service import RecognitionService
from app.routes import auth, employees, face, attendance, settings as settings_route, analytics, exports

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager: handles startup and shutdown hooks cleanly.
    """
    # --- STARTUP HOOKS ---
    logger.info("Starting up FastAPI application...")
    
    # 1. Initialize Database and run seeders
    init_db()
    
    # 2. Warm up Face Embedding Templates Cache
    try:
        RecognitionService.load_embeddings_cache()
    except Exception as e:
        logger.error(f"Error loading face embeddings cache: {e}")
        
    # 3. Spin up Background Scheduler Jobs
    try:
        SchedulerService.start()
    except Exception as e:
        logger.error(f"Error starting background scheduler: {e}")
        
    yield
    
    # --- SHUTDOWN HOOKS ---
    logger.info("Shutting down FastAPI application...")
    
    # 1. Stop background scheduler threads
    SchedulerService.stop()
    # 2. Stop camera stream thread if active
    RecognitionService.stop_camera()

# Create FastAPI Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set CORS Origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to desktop application origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(employees.router, prefix=settings.API_V1_STR)
app.include_router(face.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(settings_route.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(exports.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
def health_check():
    """Verify backend health status."""
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "database": "connected"
    }
