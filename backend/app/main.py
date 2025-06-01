"""
FastAPI main application for Emergency Flood Response System
FIXED VERSION with correct router prefixes
backend/app/main.py
"""
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import os
import logging
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError
import traceback

from app.config import settings
from app.database import engine, Base, test_connection, check_postgis
from app.routers import auth, incidents, flood_zones, rescue_units

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Emergency Flood Response API...")
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    logger.info(f"📊 Database URL: {settings.DATABASE_URL[:50]}...")
    logger.info(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
    
    # Test database connection
    try:
        if test_connection():
            logger.info("✅ Database connection successful")
            
            # Check PostGIS
            if check_postgis():
                logger.info("✅ PostGIS extension available")
            else:
                logger.warning("⚠️ PostGIS extension not available - some features may not work")
            
            # Create tables
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created/verified")
            
        else:
            logger.error("❌ Database connection failed!")
            raise Exception("Database connection failed")
            
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Emergency Flood Response API...")


# Initialize FastAPI app
app = FastAPI(
    title="Emergency Flood Response API",
    description="Comprehensive API for emergency flood response and rescue coordination system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    debug=settings.DEBUG
)

# COMPREHENSIVE CORS middleware - Updated for frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + [
        "http://localhost:5174",  # Vite default port
        "http://localhost:5173",  # Alternative Vite port
        "http://localhost:3000",  # React default port
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
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
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Date",
        "Cache-Control",
        "Pragma",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Additional CORS handling middleware for development
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    """Enhanced CORS handling for development"""
    origin = request.headers.get("origin")
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Request processing error: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
    
    # Add CORS headers
    if origin:
        # In development, be more permissive
        if settings.ENVIRONMENT == "development":
            response.headers["Access-Control-Allow-Origin"] = origin
        elif origin in settings.ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Cache-Control, Pragma"
        response.headers["Access-Control-Max-Age"] = "3600"
        response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for debugging"""
    start_time = logger.info(f"📥 {request.method} {request.url}")
    
    # Log request headers in debug mode
    if settings.DEBUG and request.method != "OPTIONS":
        logger.debug(f"Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    logger.info(f"📤 {request.method} {request.url} - {response.status_code}")
    
    return response

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} for {request.method} {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "method": request.method,
            "url": str(request.url)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation error for {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
            "status_code": 422,
            "method": request.method,
            "url": str(request.url)
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error for {request.method} {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database error occurred",
            "status_code": 500,
            "method": request.method,
            "url": str(request.url)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unexpected error for {request.method} {request.url}: {str(exc)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "status_code": 500,
            "method": request.method,
            "url": str(request.url)
        }
    )

# FIXED: Include routers with correct prefixes that match frontend expectations
# Frontend expects these exact paths (checked from logs):
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])  # FIXED: Removed /api
app.include_router(flood_zones.router, prefix="/floodzones", tags=["Flood Zones"])  # FIXED: Removed /api
app.include_router(rescue_units.router, prefix="/rescue-units", tags=["Rescue Units"])  # FIXED: Removed /api

# Static files for uploaded images
uploads_dir = "uploads"
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
    logger.info(f"📁 Created uploads directory: {uploads_dir}")

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Root endpoints
@app.get("/")
async def root():
    """Root endpoint with system information"""
    return {
        "message": "Emergency Flood Response API",
        "version": "1.0.0",
        "status": "active",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc",
        "cors_origins_count": len(settings.ALLOWED_ORIGINS),
        "database_connected": test_connection(),
        "postgis_available": check_postgis(),
        "available_endpoints": {
            "auth": "/auth/",
            "incidents": "/incidents/",  # FIXED: Updated to match new routes
            "flood_zones": "/floodzones/",  # FIXED: Updated to match new routes
            "rescue_units": "/rescue-units/"  # FIXED: Updated to match new routes
        }
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        db_status = test_connection()
        postgis_status = check_postgis() if db_status else False
        
        return {
            "status": "healthy" if db_status else "unhealthy",
            "service": "Emergency Flood Response API",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "timestamp": "2024-12-06T10:00:00Z",
            "database": {
                "connected": db_status,
                "postgis_available": postgis_status
            },
            "cors": {
                "configured": True,
                "origins_count": len(settings.ALLOWED_ORIGINS)
            },
            "features": {
                "authentication": True,
                "incidents": True,
                "rescue_units": True,
                "flood_zones": True,
                "gis": postgis_status
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "Emergency Flood Response API",
                "error": str(e)
            }
        )

@app.get("/cors-test")
async def cors_test(request: Request):
    """Test CORS configuration"""
    origin = request.headers.get("origin")
    user_agent = request.headers.get("user-agent", "Unknown")
    
    return {
        "message": "CORS test endpoint",
        "origin": origin,
        "allowed": origin in settings.ALLOWED_ORIGINS if origin else False,
        "cors_origins": settings.ALLOWED_ORIGINS[:10],  # Show first 10 for debugging
        "environment": settings.ENVIRONMENT,
        "user_agent": user_agent,
        "headers": dict(request.headers),
        "timestamp": "2024-12-06T10:00:00Z"
    }

@app.get("/api/status")
async def api_status():
    """API status endpoint for frontend monitoring"""
    try:
        from app.database import SessionLocal
        from app.models.user import User
        from app.models.incident import Incident
        from app.models.rescue_unit import RescueUnit
        from app.models.flood_zone import FloodZone
        
        db = SessionLocal()
        try:
            # Get basic counts
            user_count = db.query(User).count()
            incident_count = db.query(Incident).count()
            unit_count = db.query(RescueUnit).count()
            zone_count = db.query(FloodZone).count()
            
            return {
                "status": "operational",
                "api_version": "1.0.0",
                "database": "connected",
                "stats": {
                    "users": user_count,
                    "incidents": incident_count,
                    "rescue_units": unit_count,  
                    "flood_zones": zone_count
                },
                "endpoints": {
                    "login": "/auth/login-json",
                    "register": "/auth/register",
                    "me": "/auth/me"
                },
                "last_updated": "2024-12-06T10:00:00Z"
            }
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"API status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": str(e),
                "api_version": "1.0.0"
            }
        )

# Development routes
if settings.ENVIRONMENT == "development":
    
    @app.get("/dev/seed-demo-data")
    async def seed_demo_data():
        """Seed database with demo data (development only)"""
        try:
            from backend.scripts.seed_db import run_diagnostics
            success = run_diagnostics()
            
            if success:
                return {
                    "message": "Demo data seeded successfully",
                    "status": "success"
                }
            else:
                return JSONResponse(
                    status_code=500,
                    content={
                        "message": "Failed to seed demo data",
                        "status": "error"
                    }
                )
        except Exception as e:
            logger.error(f"Demo data seeding failed: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "message": f"Demo data seeding failed: {str(e)}",
                    "status": "error"
                }
            )
    
    @app.get("/dev/test-db")
    async def test_database():
        """Test database connection (development only)"""
        try:
            from app.database import SessionLocal
            from sqlalchemy import text
            
            db = SessionLocal()
            try:
                # Test basic query
                result = db.execute(text("SELECT 1 as test")).fetchone()
                
                # Test PostGIS if available
                postgis_test = None
                try:
                    postgis_result = db.execute(text("SELECT PostGIS_Version()")).fetchone()
                    postgis_test = postgis_result[0] if postgis_result else None
                except:
                    postgis_test = "Not available"
                
                return {
                    "database_connection": "OK",
                    "test_query_result": result[0] if result else None,
                    "postgis_version": postgis_test,
                    "status": "success"
                }
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Database test failed: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "database_connection": "FAILED",
                    "error": str(e),
                    "status": "error"
                }
            )

# Debug: List all available routes
@app.get("/debug/routes")
async def list_routes():
    """List all available routes for debugging"""
    if settings.ENVIRONMENT == "development":
        routes = []
        for route in app.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                routes.append({
                    "path": route.path,
                    "methods": list(route.methods),
                    "name": getattr(route, 'name', 'unnamed')
                })
        return {"routes": routes}
    else:
        raise HTTPException(status_code=404, detail="Not found")

# Startup message
@app.on_event("startup")
async def startup_message():
    """Log startup message"""
    logger.info("🎉 Emergency Flood Response API is ready!")
    logger.info(f"📍 API Base URL: {settings.DATABASE_URL[:30]}...")
    logger.info(f"📚 Documentation: /docs")
    logger.info(f"🔧 Environment: {settings.ENVIRONMENT}")
    logger.info("🛣️ Available endpoints:")
    logger.info("   - POST /auth/login-json")
    logger.info("   - POST /auth/register")
    logger.info("   - GET /auth/me")
    logger.info("   - GET /incidents/")  # FIXED: Updated endpoint paths
    logger.info("   - GET /floodzones/")  # FIXED: Updated endpoint paths
    logger.info("   - GET /rescue-units/")  # FIXED: Updated endpoint paths

if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug",
        access_log=True
    )