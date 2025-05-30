"""
Configuration settings for the Emergency Flood Response API
Updated for Supabase PostgreSQL
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Supabase Database Configuration
    DATABASE_URL: str = "postgresql://postgres:jaivmessi@db.yzbzlqixillvacxigdtl.supabase.co:5432/postgres"
    
    # JWT Authentication
    SECRET_KEY: str = "flood-response-secret-key-2024-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for better UX
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-frontend-domain.vercel.app",
        "https://emergency-flood-response.vercel.app"
    ]
    
    # Cloudinary (for image uploads) - Optional
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # App Settings
    APP_NAME: str = "Emergency Flood Response API"
    DEBUG: bool = True
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # GIS Settings
    DEFAULT_SRID: int = 4326  # WGS84 coordinate system
    SEARCH_RADIUS_KM: float = 10.0  # Default search radius in kilometers
    
    # Supabase specific settings
    SUPABASE_URL: Optional[str] = "https://yzbzlqixillvacxigdtl.supabase.co"
    SUPABASE_ANON_KEY: Optional[str] = None  # Set if using Supabase client
    
    # Performance settings
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

# Environment-specific overrides
environment = os.getenv("ENVIRONMENT", "development")

if environment == "production":
    settings.DEBUG = False
    # Override with production database URL if provided
    prod_db_url = os.getenv("DATABASE_URL")
    if prod_db_url:
        settings.DATABASE_URL = prod_db_url
    
    # Override secret key in production
    prod_secret = os.getenv("SECRET_KEY")
    if prod_secret:
        settings.SECRET_KEY = prod_secret
    
    # Production CORS origins
    prod_origins = os.getenv("ALLOWED_ORIGINS")
    if prod_origins:
        settings.ALLOWED_ORIGINS = [origin.strip() for origin in prod_origins.split(",")]

# Cloudinary settings from environment
settings.CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
settings.CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
settings.CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Supabase settings from environment
settings.SUPABASE_URL = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
settings.SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

print(f"🔧 Configuration loaded for {environment} environment")
print(f"🗄️ Database: {settings.DATABASE_URL[:50]}...")
print(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
print(f"🔒 JWT Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")