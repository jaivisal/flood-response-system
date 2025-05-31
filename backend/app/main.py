"""
FastAPI main application for Emergency Flood Response System
UPDATED VERSION with comprehensive CORS handling
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
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
    print(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
    
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

# COMPREHENSIVE CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "X-CSRF-Token",
        "X-Requested-With",
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Date",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Additional CORS handling middleware for development
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    origin = request.headers.get("origin")
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = JSONResponse(content={"detail": "OK"}, status_code=200)
    else:
        response = await call_next(request)
    
    # Add CORS headers
    if origin:
        if origin in settings.ALLOWED_ORIGINS or settings.ENVIRONMENT == "development":
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin"
            response.headers["Access-Control-Max-Age"] = "3600"
    
    # For development, be more permissive
    if settings.ENVIRONMENT == "development":
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Debug middleware to log CORS requests
@app.middleware("http")
async def debug_cors(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and settings.DEBUG:
        print(f"🌐 CORS Request: {request.method} {request.url} from {origin}")
        if origin in settings.ALLOWED_ORIGINS:
            print(f"✅ Origin {origin} is allowed")
        else:
            print(f"⚠️ Origin {origin} is NOT in allowed list")
    
    response = await call_next(request)
    return response

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
        "docs": "/docs",
        "cors_origins_count": len(settings.ALLOWED_ORIGINS)
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Emergency Flood Response API",
        "version": "1.0.0",
        "cors_configured": True,
        "origins_count": len(settings.ALLOWED_ORIGINS)
    }


@app.get("/cors-test")
async def cors_test(request: Request):
    """Test CORS configuration"""
    origin = request.headers.get("origin")
    return {
        "origin": origin,
        "allowed": origin in settings.ALLOWED_ORIGINS if origin else False,
        "cors_origins": settings.ALLOWED_ORIGINS[:10],  # Show first 10 for debugging
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )