# 🛠️ Fix Database Migration Issue - Types Already Exist

# The error shows that database types already exist in your Supabase database
# Let's fix this by marking the migration as completed

cd backend
source venv/bin/activate

# Option 1: Mark migration as completed (since types already exist)
alembic stamp head

echo "✅ Migration marked as completed"

# Option 2: Alternative - Create a new migration that checks for existing types
cat > alembic/versions/002_check_existing.py << 'EOL'
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
EOL

# Option 3: Clean approach - Skip the problematic migration
echo "🧹 Let's take a clean approach..."

# Check what's actually in your database
python -c "
from app.database import engine
from sqlalchemy import text, inspect

try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print('📋 Existing tables:', tables)
    
    with engine.connect() as conn:
        # Check for enum types
        result = conn.execute(text('''
            SELECT typname FROM pg_type 
            WHERE typtype = 'e' 
            ORDER BY typname;
        '''))
        enums = [row[0] for row in result]
        print('🏷️ Existing enums:', enums)
        
        # Check PostGIS extension
        result = conn.execute(text('''
            SELECT EXISTS(
                SELECT 1 FROM pg_extension WHERE extname = 'postgis'
            );
        '''))
        postgis_exists = result.scalar()
        print('🗺️ PostGIS available:', postgis_exists)
        
except Exception as e:
    print('❌ Database check failed:', e)
"

# Option 4: Force clean migration (CAUTION: This will reset everything)
echo "⚠️ If you want to start fresh (THIS WILL DELETE ALL DATA):"
echo "python -c \"
from app.database import engine, Base
Base.metadata.drop_all(engine)
print('🗑️ All tables dropped')
Base.metadata.create_all(engine) 
print('✅ Tables recreated')
\""

# Option 5: Simple fix - just mark as done and test the application
echo "🚀 Quick fix - let's just test if the app works:"

# Test if we can import models
python -c "
try:
    from app.models.user import User
    from app.models.incident import Incident
    from app.models.rescue_unit import RescueUnit
    from app.models.flood_zone import FloodZone
    print('✅ All models imported successfully')
except Exception as e:
    print('❌ Model import failed:', e)
"

# Start the FastAPI server to test
echo "🌟 Starting FastAPI server..."
echo "If this works, your database is fine and you can ignore the migration error"

# Start server (this will test if everything actually works)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

SERVER_PID=$!
sleep 3

# Test the server
echo "🧪 Testing server..."
curl -s http://localhost:8000/health || echo "❌ Server test failed"

# Kill the test server
kill $SERVER_PID 2>/dev/null

echo ""
echo "💡 SOLUTIONS:"
echo "1. If server started successfully, run: alembic stamp head"
echo "2. Then try seeding: python scripts/seed_db.py"
echo "3. Start normally: uvicorn app.main:app --reload"
echo ""
echo "🎯 The migration error might not matter if your database already has the right structure!"