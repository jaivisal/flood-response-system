"""
FastAPI main application for Emergency Flood Response System
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import auth, incidents, flood_zones, rescue_units


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting Emergency Flood Response API...")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Emergency Flood Response API...")


# Initialize FastAPI app
app = FastAPI(
    title="Emergency Flood Response API",
    description="API for emergency flood response and rescue coordination system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(flood_zones.router, prefix="/floodzones", tags=["Flood Zones"])
app.include_router(rescue_units.router, prefix="/rescue-units", tags=["Rescue Units"])

# Static files for uploaded images
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Emergency Flood Response API",
        "version": "1.0.0",
        "status": "active",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Emergency Flood Response API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )