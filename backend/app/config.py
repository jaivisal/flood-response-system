"""
Configuration settings for the Emergency Flood Response API
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/flood_response"
    
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
        """Get allowed CORS origins"""
        # Development origins
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:5173", 
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:5176",
            "http://127.0.0.1:5177",
            "http://127.0.0.1:8080",
        ]
        
        # Production origins
        prod_origins = [
            "https://emergency-flood-response.vercel.app",
            "https://flood-response.netlify.app",
        ]
        
        # Environment-specific origins
        env_origins = []
        cors_origins_env = os.getenv("CORS_ORIGINS", "")
        if cors_origins_env:
            env_origins = [origin.strip() for origin in cors_origins_env.split(",")]
        
        return dev_origins + prod_origins + env_origins


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

# Print configuration status
print(f"🔧 Configuration loaded for {settings.ENVIRONMENT} environment")
print(f"🗄️ Database configured: {settings.DATABASE_URL}")
print(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
print(f"🔒 JWT Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")