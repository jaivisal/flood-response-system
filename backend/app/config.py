"""
Configuration settings for the Emergency Flood Response API
Updated for Supabase PostgreSQL integration and frontend compatibility
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration - Supabase PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:jaivmessi@db.yzbzlqixillvacxigdtl.supabase.co:5432/postgres"
    
    # Alternative database URL formats for different environments
    DATABASE_HOST: str = "db.yzbzlqixillvacxigdtl.supabase.co"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "postgres"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "jaivmessi"
    
    # JWT Authentication
    SECRET_KEY: str = "flood-response-secret-key-2024-change-in-production-secure-key-456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # App Settings
    APP_NAME: str = "Emergency Flood Response API"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    VERSION: str = "1.0.0"
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    
    # GIS Settings
    DEFAULT_SRID: int = 4326  # WGS84
    SEARCH_RADIUS_KM: float = 10.0
    MAX_SEARCH_RADIUS_KM: float = 100.0
    
    # Performance and Security Settings
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    DATABASE_POOL_TIMEOUT: int = 60
    DATABASE_POOL_RECYCLE: int = 300  # 5 minutes
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # SSL Configuration for Supabase
    DATABASE_SSL_MODE: str = "require"
    DATABASE_SSL_CERT_PATH: Optional[str] = None
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Emergency Flood Response System"
    
    # Frontend Configuration
    FRONTEND_URL: str = "http://localhost:5174"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_prefix = ""

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Get allowed CORS origins for frontend integration"""
        # Development origins (React dev servers)
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:5173", 
            "http://localhost:5174",  # Primary Vite dev server
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5183",
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
            "https://flood-response-system.herokuapp.com",
            "https://yzbzlqixillvacxigdtl.supabase.co",  # Supabase dashboard
        ]
        
        # Environment-specific origins from env vars
        env_origins = []
        cors_origins_env = os.getenv("CORS_ORIGINS", "")
        if cors_origins_env:
            env_origins = [origin.strip() for origin in cors_origins_env.split(",")]
        
        # Add frontend URL if specified
        if self.FRONTEND_URL and self.FRONTEND_URL not in dev_origins + prod_origins:
            env_origins.append(self.FRONTEND_URL)
        
        return dev_origins + prod_origins + env_origins

    @property
    def DATABASE_URL_WITH_PARAMS(self) -> str:
        """Get database URL with SSL and connection parameters for Supabase"""
        base_url = self.DATABASE_URL
        
        # Add SSL and connection parameters for Supabase
        if "supabase.co" in base_url:
            if "?" not in base_url:
                base_url += "?"
            else:
                base_url += "&"
            
            params = [
                "sslmode=require",
                "connect_timeout=10",
                "application_name=flood_response_api"
            ]
            base_url += "&".join(params)
        
        return base_url

    @property
    def DATABASE_CONFIG(self) -> dict:
        """Get database configuration for SQLAlchemy"""
        config = {
            "echo": self.DEBUG,
            "pool_pre_ping": True,
            "pool_recycle": self.DATABASE_POOL_RECYCLE,
            "pool_size": self.DATABASE_POOL_SIZE,
            "max_overflow": self.DATABASE_MAX_OVERFLOW,
            "pool_timeout": self.DATABASE_POOL_TIMEOUT,
        }
        
        # Add SSL configuration for Supabase
        if "supabase.co" in self.DATABASE_URL:
            config.update({
                "connect_args": {
                    "sslmode": "require",
                    "connect_timeout": 10,
                    "application_name": "flood_response_api",
                    "options": "-c timezone=UTC"
                }
            })
        
        return config

    def get_cors_config(self) -> dict:
        """Get CORS configuration for FastAPI"""
        return {
            "allow_origins": self.ALLOWED_ORIGINS,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
            "allow_headers": [
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
                "Cache-Control",
                "Pragma",
            ],
            "expose_headers": ["*"],
            "max_age": 3600,  # Cache preflight requests for 1 hour
        }

    def validate_database_connection(self) -> bool:
        """Validate that database connection string is properly formatted"""
        try:
            if not self.DATABASE_URL:
                return False
            
            # Basic validation for PostgreSQL URL
            required_parts = ["postgresql://", self.DATABASE_USER, self.DATABASE_PASSWORD, self.DATABASE_HOST]
            return all(part in self.DATABASE_URL for part in required_parts if part)
        except Exception:
            return False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

# Validate configuration on import
if not settings.validate_database_connection():
    print("⚠️ Warning: Database URL may not be properly formatted")

# Print configuration status
print(f"🔧 Configuration loaded for {settings.ENVIRONMENT} environment")
print(f"🗄️ Database configured: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}")
print(f"🌐 CORS Origins: {len(settings.ALLOWED_ORIGINS)} configured")
print(f"🔒 JWT Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
print(f"🚀 API Version: {settings.VERSION}")

# Environment-specific configurations
if settings.ENVIRONMENT == "production":
    # Production-specific settings
    settings.DEBUG = False
    print("🔒 Production mode: Debug disabled")
elif settings.ENVIRONMENT == "development":
    print("🛠️ Development mode: Enhanced logging enabled")
    
# SSL/TLS Configuration for Supabase
if "supabase.co" in settings.DATABASE_URL:
    print("☁️ Supabase PostgreSQL detected - SSL enabled")
    print(f"🔗 Database SSL mode: {settings.DATABASE_SSL_MODE}")

# Health check function
def check_required_settings() -> List[str]:
    """Check for required settings and return missing ones"""
    missing = []
    
    required_settings = [
        "DATABASE_URL",
        "SECRET_KEY",
        "APP_NAME"
    ]
    
    for setting in required_settings:
        if not getattr(settings, setting, None):
            missing.append(setting)
    
    return missing

# Validate required settings
missing_settings = check_required_settings()
if missing_settings:
    print(f"❌ Missing required settings: {', '.join(missing_settings)}")
else:
    print("✅ All required settings present")

# Export commonly used values
DATABASE_URL = settings.DATABASE_URL_WITH_PARAMS
CORS_CONFIG = settings.get_cors_config()
DATABASE_CONFIG = settings.DATABASE_CONFIG