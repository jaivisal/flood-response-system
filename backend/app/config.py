"""
Configuration settings for the Emergency Flood Response API
Fixed version that works without JSON parsing errors
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:jaivmessi@db.yzbzlqixillvacxigdtl.supabase.co:5432/postgres"
    
    # JWT Authentication
    SECRET_KEY: str = "flood-response-secret-key-2024-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # App Settings
    APP_NAME: str = "Emergency Flood Response API"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # GIS Settings
    DEFAULT_SRID: int = 4326
    SEARCH_RADIUS_KM: float = 10.0
    
    # Optional settings
    SUPABASE_URL: Optional[str] = "https://yzbzlqixillvacxigdtl.supabase.co"
    SUPABASE_ANON_KEY: Optional[str] = None
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Performance settings
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    RATE_LIMIT_PER_MINUTE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Get allowed CORS origins - fixed to avoid JSON parsing"""
        return [
            "http://localhost:3000",
            "http://localhost:5173", 
            "http://localhost:5174",
            "https://emergency-flood-response.vercel.app"
        ]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

# Print configuration status
print(f"🔧 Configuration loaded for {settings.ENVIRONMENT} environment")
print(f"🗄️ Database configured")
print(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
print(f"🔒 JWT Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
