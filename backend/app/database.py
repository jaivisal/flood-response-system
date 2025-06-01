"""
Updated Database configuration and session management
backend/app/database.py - COMPLETE VERSION for PostgreSQL
"""
from sqlalchemy import create_engine, MetaData, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import logging
import time

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database engine configuration for PostgreSQL with connection pooling
engine_kwargs = {
    "echo": False,  # Set to True for SQL query logging
    "pool_pre_ping": True,  # Verify connections before use
    "pool_recycle": 3600,  # Recycle connections every hour
    "pool_size": 20,  # Increase pool size for better performance
    "max_overflow": 30,  # Allow more overflow connections
    "pool_timeout": 30,  # Connection timeout
    "poolclass": QueuePool,  # Use QueuePool for PostgreSQL
    "connect_args": {
        "options": "-c timezone=UTC",  # Set timezone
        "application_name": "flood_response_api",  # Application identifier
        "connect_timeout": 10,  # Connection timeout
    }
}

# Create database engine
try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
    logger.info(f"✅ Database engine created successfully for: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'database'}")
except Exception as e:
    logger.error(f"❌ Failed to create database engine: {e}")
    raise

# Add event listeners for connection management
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set PostgreSQL specific settings"""
    if 'postgresql' in str(dbapi_connection):
        with dbapi_connection.cursor() as cursor:
            # Set timezone
            cursor.execute("SET timezone TO 'UTC'")
            # Set application name
            cursor.execute("SET application_name TO 'flood_response_api'")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log connection checkout for debugging"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log connection checkin for debugging"""
    logger.debug("Connection checked in to pool")

# Session factory with optimized settings
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False,  # Keep objects accessible after commit
    class_=Session
)

# Base class for models
Base = declarative_base()

# Metadata for schema management
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session with proper error handling
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
        # Enable PostGIS extension
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
            logger.info("✅ PostGIS extension enabled")
        
        # Create all tables
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


def test_connection() -> bool:
    """Test database connection with retry logic"""
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                if result.fetchone():
                    logger.info(f"✅ Database connection successful (attempt {attempt + 1})")
                    return True
        except Exception as e:
            logger.warning(f"⚠️ Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"❌ Database connection failed after {max_retries} attempts")
                return False
    return False


def check_postgis() -> bool:
    """Check if PostGIS extension is available and properly installed"""
    try:
        with engine.connect() as conn:
            # Check if PostGIS extension exists
            result = conn.execute(
                text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
            )
            if result.fetchone()[0]:
                logger.info("✅ PostGIS extension is available")
                
                # Test PostGIS functionality
                test_result = conn.execute(
                    text("SELECT ST_AsText(ST_MakePoint(78.1198, 9.9252))")
                )
                if test_result.fetchone():
                    logger.info("✅ PostGIS functionality verified")
                    return True
            else:
                logger.warning("⚠️ PostGIS extension not found")
                return False
    except Exception as e:
        logger.warning(f"⚠️ Could not check PostGIS availability: {e}")
        return False


def get_session() -> Session:
    """Get a new database session for direct use"""
    return SessionLocal()


def get_db_info() -> dict:
    """Get database information for monitoring"""
    try:
        with engine.connect() as conn:
            # Get PostgreSQL version
            version_result = conn.execute(text("SELECT version()"))
            version = version_result.fetchone()[0]
            
            # Get database name
            db_result = conn.execute(text("SELECT current_database()"))
            database_name = db_result.fetchone()[0]
            
            # Get connection count
            conn_result = conn.execute(
                text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
            )
            connection_count = conn_result.fetchone()[0]
            
            # Check PostGIS
            postgis_available = check_postgis()
            
            return {
                "database_url": settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'hidden',
                "database_name": database_name,
                "version": version.split(' ')[1] if ' ' in version else version,
                "connection_count": connection_count,
                "postgis_available": postgis_available,
                "pool_size": engine.pool.size(),
                "checked_out_connections": engine.pool.checkedout(),
                "overflow": engine.pool.overflow(),
                "status": "healthy"
            }
    except Exception as e:
        logger.error(f"❌ Error getting database info: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


def init_database():
    """Initialize database with extensions and verify setup"""
    logger.info("🚀 Initializing database...")
    
    # Test connection
    if not test_connection():
        raise Exception("Database connection failed")
    
    # Check PostGIS
    postgis_ok = check_postgis()
    if not postgis_ok:
        logger.warning("⚠️ PostGIS not available - geographic features may not work")
    
    # Create tables
    create_tables()
    
    # Log database info
    db_info = get_db_info()
    logger.info(f"📊 Database Info: {db_info}")
    
    logger.info("✅ Database initialization completed")


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


# Utility functions for database management
def execute_sql(sql: str, params: dict = None) -> any:
    """Execute raw SQL with parameters"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql), params or {})
            conn.commit()
            return result
    except Exception as e:
        logger.error(f"Error executing SQL: {e}")
        raise


def get_table_info(table_name: str) -> dict:
    """Get information about a specific table"""
    try:
        with engine.connect() as conn:
            # Get column information
            columns_result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = :table_name 
                ORDER BY ordinal_position
            """), {"table_name": table_name})
            
            columns = [dict(row._mapping) for row in columns_result]
            
            # Get row count
            count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            row_count = count_result.fetchone()[0]
            
            return {
                "table_name": table_name,
                "columns": columns,
                "row_count": row_count
            }
    except Exception as e:
        logger.error(f"Error getting table info for {table_name}: {e}")
        return {"error": str(e)}


def health_check() -> dict:
    """Comprehensive database health check"""
    try:
        start_time = time.time()
        
        # Test basic connection
        connection_ok = test_connection()
        
        # Test PostGIS
        postgis_ok = check_postgis()
        
        # Get database info
        db_info = get_db_info()
        
        # Test write operation
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE TEMP TABLE test_write (id INTEGER)"))
                conn.execute(text("INSERT INTO test_write VALUES (1)"))
                conn.execute(text("DROP TABLE test_write"))
                write_ok = True
        except Exception:
            write_ok = False
        
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


# Initialize database on import (only if not in testing)
if __name__ != "__main__":
    try:
        # Quick connection test
        if test_connection():
            logger.info("🟢 Database is accessible")
            # Check PostGIS availability
            check_postgis()
        else:
            logger.warning("🟡 Database connection issues detected")
    except Exception as e:
        logger.error(f"🔴 Database initialization error: {e}")


# Export commonly used items
__all__ = [
    'engine', 'SessionLocal', 'Base', 'get_db', 'create_tables', 
    'test_connection', 'check_postgis', 'DatabaseSession', 
    'health_check', 'init_database', 'get_db_info'
]