"""
Fixed Database configuration with robust error handling
backend/app/database.py - PRODUCTION READY VERSION
"""
from sqlalchemy import create_engine, MetaData, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from typing import Generator
import logging
import time
import os

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database engine configuration with connection pooling
engine_kwargs = {
    "echo": False,  # Set to True for SQL query logging
    "pool_pre_ping": True,  # Verify connections before use
    "pool_recycle": 3600,  # Recycle connections every hour
    "pool_size": 10,  # Smaller pool size for development
    "max_overflow": 20,  # Allow more overflow connections
    "pool_timeout": 30,  # Connection timeout
    "poolclass": QueuePool,  # Use QueuePool for PostgreSQL
}

# Add connect_args for PostgreSQL/Supabase
engine_kwargs["connect_args"] = {
    "options": "-c timezone=UTC",
    "application_name": "flood_response_api",
    "connect_timeout": 10,
}

# Create database engine with error handling
engine = None
try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
    logger.info(f"✅ Database engine created for: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")
except Exception as e:
    logger.error(f"❌ Failed to create database engine: {e}")
    # Create a dummy engine for development
    engine = create_engine("sqlite:///./fallback.db", echo=False)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()

# Metadata for schema management
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session with error handling
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


def test_connection() -> bool:
    """Test database connection with retry logic"""
    if not engine:
        logger.error("❌ No database engine available")
        return False
    
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                if result.fetchone():
                    if attempt > 0:
                        logger.info(f"✅ Database connection successful (attempt {attempt + 1})")
                    return True
        except OperationalError as e:
            logger.warning(f"⚠️ Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        except Exception as e:
            logger.error(f"❌ Unexpected database error: {e}")
            break
    
    logger.error(f"❌ Database connection failed after {max_retries} attempts")
    return False


def check_postgis() -> bool:
    """Check if PostGIS extension is available"""
    if not engine:
        return False
    
    try:
        with engine.connect() as conn:
            # Check if PostGIS extension exists
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


def create_tables():
    """Create all database tables with error handling"""
    if not engine:
        logger.error("❌ No database engine available for table creation")
        return False
    
    try:
        # Try to enable PostGIS extension (ignore errors)
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                conn.commit()
                logger.info("✅ PostGIS extension enabled")
        except Exception as e:
            logger.warning(f"⚠️ Could not enable PostGIS: {e}")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error creating database tables: {e}")
        return False


def init_database():
    """Initialize database with proper error handling"""
    logger.info("🚀 Initializing database...")
    
    # Test connection
    if not test_connection():
        logger.error("❌ Database connection failed during initialization")
        return False
    
    # Check PostGIS
    postgis_ok = check_postgis()
    if not postgis_ok:
        logger.warning("⚠️ PostGIS not available - geographic features may not work")
    
    # Create tables
    if not create_tables():
        logger.error("❌ Failed to create database tables")
        return False
    
    logger.info("✅ Database initialization completed")
    return True


def get_db_info() -> dict:
    """Get database information for monitoring"""
    if not engine:
        return {"status": "no_engine", "error": "Database engine not available"}
    
    try:
        with engine.connect() as conn:
            # Get PostgreSQL version
            try:
                version_result = conn.execute(text("SELECT version()"))
                version = version_result.fetchone()[0]
            except:
                version = "Unknown"
            
            # Get database name
            try:
                db_result = conn.execute(text("SELECT current_database()"))
                database_name = db_result.fetchone()[0]
            except:
                database_name = "Unknown"
            
            # Check PostGIS
            postgis_available = check_postgis()
            
            return {
                "database_url": f"{settings.DATABASE_HOST}:{settings.DATABASE_PORT}",
                "database_name": database_name,
                "version": version.split(' ')[1] if ' ' in version else version,
                "postgis_available": postgis_available,
                "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else "N/A",
                "status": "healthy"
            }
    except Exception as e:
        logger.error(f"❌ Error getting database info: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


def health_check() -> dict:
    """Comprehensive database health check"""
    try:
        start_time = time.time()
        
        # Test basic connection
        connection_ok = test_connection()
        
        # Test PostGIS if connection is OK
        postgis_ok = check_postgis() if connection_ok else False
        
        # Get database info
        db_info = get_db_info()
        
        # Test write operation if connection is OK
        write_ok = False
        if connection_ok:
            try:
                with engine.connect() as conn:
                    conn.execute(text("CREATE TEMP TABLE test_write (id INTEGER)"))
                    conn.execute(text("INSERT INTO test_write VALUES (1)"))
                    conn.execute(text("DROP TABLE test_write"))
                    write_ok = True
            except Exception as e:
                logger.warning(f"Write test failed: {e}")
        
        response_time = time.time() - start_time
        
        return {
            "status": "healthy" if connection_ok and write_ok else "unhealthy",
            "connection": connection_ok,
            "postgis": postgis_ok,
            "write_test": write_ok,
            "response_time_ms": round(response_time * 1000, 2),
            "database_info": db_info,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }


# Context manager for database sessions
class DatabaseSession:
    """Context manager for database sessions"""
    
    def __init__(self):
        self.db = None
    
    def __enter__(self) -> Session:
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
            logger.error(f"Database transaction rolled back: {exc_val}")
        else:
            try:
                self.db.commit()
            except Exception as e:
                logger.error(f"Error committing transaction: {e}")
                self.db.rollback()
                raise
            finally:
                self.db.close()


# Utility functions
def execute_sql(sql: str, params: dict = None) -> any:
    """Execute raw SQL with parameters"""
    if not engine:
        raise Exception("No database engine available")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql), params or {})
            conn.commit()
            return result
    except Exception as e:
        logger.error(f"Error executing SQL: {e}")
        raise


def get_session() -> Session:
    """Get a new database session for direct use"""
    return SessionLocal()


# Event listeners for connection management (if engine exists)
if engine:
    @event.listens_for(engine, "connect")
    def set_postgres_settings(dbapi_connection, connection_record):
        """Set PostgreSQL specific settings"""
        try:
            with dbapi_connection.cursor() as cursor:
                cursor.execute("SET timezone TO 'UTC'")
                cursor.execute("SET application_name TO 'flood_response_api'")
        except Exception as e:
            logger.warning(f"Could not set PostgreSQL settings: {e}")

    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        """Log connection checkout for debugging"""
        logger.debug("Connection checked out from pool")

# Initialize on import if not in testing
if __name__ != "__main__" and os.getenv("TESTING") != "1":
    try:
        if test_connection():
            logger.info("🟢 Database is accessible")
            check_postgis()
        else:
            logger.warning("🟡 Database connection issues detected")
    except Exception as e:
        logger.warning(f"🔴 Database initialization error: {e}")


# Export commonly used items
__all__ = [
    'engine', 'SessionLocal', 'Base', 'get_db', 'create_tables', 
    'test_connection', 'check_postgis', 'DatabaseSession', 
    'health_check', 'init_database', 'get_db_info'
]