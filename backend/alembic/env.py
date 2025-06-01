from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys
import logging

# Add the parent directory to the path so we can import our models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base
from app.config import settings

# Import all models to ensure they're registered with SQLAlchemy
from app.models.user import User
from app.models.incident import Incident
from app.models.rescue_unit import RescueUnit
from app.models.flood_zone import FloodZone

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

# Configure logging
logger = logging.getLogger('alembic.env')

def get_url():
    """Get database URL from environment or settings"""
    # Priority: Environment variable > Settings > Config file
    database_url = (
        os.getenv("DATABASE_URL") or 
        settings.DATABASE_URL or 
        config.get_main_option("sqlalchemy.url")
    )
    
    # Handle both postgres:// and postgresql:// schemes
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    logger.info(f"Using database URL: {database_url[:20]}...")
    return database_url

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = get_url()
    
    if not url:
        raise ValueError("No database URL found. Please set DATABASE_URL environment variable.")
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        render_as_batch=False,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # Get database URL
    database_url = get_url()
    
    if not database_url:
        raise ValueError("No database URL found. Please set DATABASE_URL environment variable.")
    
    # Override the sqlalchemy.url from alembic.ini with our settings
    configuration = config.get_section(config.config_ini_section)
    if configuration is None:
        configuration = {}
    
    configuration["sqlalchemy.url"] = database_url
    
    # Engine configuration optimized for PostgreSQL + PostGIS
    engine_config = {
        "poolclass": pool.NullPool,  # Use NullPool for migrations
        "pool_pre_ping": True,
        "connect_args": {
            "connect_timeout": 30,
            "application_name": "flood_response_alembic",
        },
        "echo": False,  # Set to True for SQL debugging
    }
    
    # Create engine
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        **engine_config
    )

    try:
        with connectable.connect() as connection:
            # Test PostGIS availability
            try:
                result = connection.execute(
                    "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis')"
                )
                has_postgis = result.fetchone()[0]
                if has_postgis:
                    logger.info("✅ PostGIS extension is available")
                else:
                    logger.warning("⚠️ PostGIS extension not found - will be created during migration")
            except Exception as e:
                logger.warning(f"⚠️ Could not check PostGIS: {e}")

            # Configure migration context
            context.configure(
                connection=connection, 
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
                render_as_batch=False,
                # Include schema in comparison for better conflict detection
                include_schemas=True,
                # Transaction per migration for safety
                transaction_per_migration=True,
            )

            # Run migrations within a transaction
            with context.begin_transaction():
                logger.info("🚀 Starting database migration...")
                context.run_migrations()
                logger.info("✅ Migration completed successfully!")
                
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise


# Main execution
if context.is_offline_mode():
    logger.info("Running migrations in offline mode...")
    run_migrations_offline()
else:
    logger.info("Running migrations in online mode...")
    run_migrations_online()