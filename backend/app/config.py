"""
Configuration settings for the Emergency Flood Response API
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/flood_response"
    
    # JWT Authentication
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-frontend-domain.vercel.app"
    ]
    
    # Cloudinary (for image uploads)
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
    DEFAULT_SRID: int = 4326  # WGS84
    SEARCH_RADIUS_KM: float = 10.0  # Default search radius in kilometers
    
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
if os.getenv("ENVIRONMENT") == "production":
    settings.DEBUG = False
    settings.DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    settings.SECRET_KEY = os.getenv("SECRET_KEY", settings.SECRET_KEY)
    
    # Production CORS origins
    prod_origins = os.getenv("ALLOWED_ORIGINS")
    if prod_origins:
        settings.ALLOWED_ORIGINS = prod_origins.split(",")

# Cloudinary settings from environment
settings.CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
settings.CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
settings.CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")