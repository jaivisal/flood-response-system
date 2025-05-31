"""
Fixed Database configuration and session management
backend/app/database.py - UPDATED VERSION
"""
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from geoalchemy2 import Geography
from typing import Generator
import logging

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database engine configuration - FIXED VERSION
engine_kwargs = {
    "echo": False,  # Set to False to reduce log noise
    "pool_pre_ping": True,
    "pool_recycle": 300,  # Recycle connections every 5 minutes
    "pool_size": 10,
    "max_overflow": 20,
}

# Handle SQLite for development (though PostgreSQL is recommended)
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "poolclass": StaticPool,
        "connect_args": {"check_same_thread": False}
    })
    logger.warning("Using SQLite - PostGIS features will be limited")

# Create database engine
try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
    logger.info("✅ Database engine created successfully")
except Exception as e:
    logger.error(f"❌ Failed to create database engine: {e}")
    raise

# Session factory - FIXED VERSION
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # Prevent expiry issues
)

# Base class for models
Base = declarative_base()

# Metadata for schema management
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session - FIXED VERSION
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Error creating database tables: {e}")
        raise


def drop_tables():
    """Drop all database tables (use with caution!)"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("🗑️ Database tables dropped successfully")
    except Exception as e:
        logger.error(f"❌ Error dropping database tables: {e}")
        raise


# Test database connection
def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            # Use text() to create an executable SQL expression
            result = conn.execute(text("SELECT 1"))
            if result.fetchone():
                logger.info("✅ Database connection successful")
                return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False
    return False


# Check PostGIS extension
def check_postgis():
    """Check if PostGIS extension is available"""
    try:
        with engine.connect() as conn:
            # Use text() for the SQL query
            result = conn.execute(
                text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
            )
            if result.fetchone()[0]:
                logger.info("✅ PostGIS extension is available")
                return True
            else:
                logger.warning("⚠️ PostGIS extension not found")
                return False
    except Exception as e:
        logger.warning(f"⚠️ Could not check PostGIS availability: {e}")
        return False


# Get database session for direct use
def get_session() -> Session:
    """Get a new database session for direct use"""
    return SessionLocal()


# Context manager for database sessions
class DatabaseSession:
    def __init__(self):
        self.db = None
    
    def __enter__(self) -> Session:
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
        else:
            self.db.commit()
        self.db.close()


# Initialize database on import
if __name__ != "__main__":
    # Test connection when module is imported
    if test_connection():
        check_postgis()