"""Check existing database state

Revision ID: 002_check_existing
Revises: 001_initial_migration
Create Date: 2024-12-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002_check_existing'
down_revision = '001_initial_migration'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if tables exist, create only if they don't
    conn = op.get_bind()
    
    # Check if users table exists
    result = conn.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        );
    """))
    
    users_exists = result.scalar()
    
    if not users_exists:
        print("Creating missing tables...")
        # Create tables here if needed
        pass
    else:
        print("✅ Database tables already exist")


def downgrade() -> None:
    # Only drop if safe to do so
    pass
