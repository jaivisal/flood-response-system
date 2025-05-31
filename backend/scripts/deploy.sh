#!/bin/bash

# Quick Fix Commands for Emergency Flood Response System
# Run these commands to diagnose and fix the authentication issue

echo "🔧 Emergency Flood Response System - Quick Fix"
echo "============================================="

# Navigate to backend directory
cd backend

echo "1. 🔍 Testing database connection..."
python3 -c "
import sys
sys.path.append('.')
from app.database import test_connection, check_postgis
if test_connection():
    print('✅ Database connection successful')
    if check_postgis():
        print('✅ PostGIS extension available')
    else:
        print('⚠️  PostGIS extension not available')
else:
    print('❌ Database connection failed')
    exit(1)
"

echo ""
echo "2. 🗄️ Running database migrations..."
source venv/bin/activate
alembic upgrade head

echo ""
echo "3. 👥 Checking and creating demo users..."
python3 -c "
import sys
sys.path.append('.')
from scripts.seed_db import run_diagnostics
run_diagnostics()
"

echo ""
echo "4. 🧪 Testing authentication..."
python3 -c "
import sys
sys.path.append('.')
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
try:
    # Test responder account
    user = db.query(User).filter(User.email == 'responder@demo.com').first()
    if user:
        if user.verify_password('demo123'):
            print('✅ responder@demo.com authentication works')
        else:
            print('❌ responder@demo.com authentication failed')
            # Reset password
            user.set_password('demo123')
            db.commit()
            print('🔄 Password reset for responder@demo.com')
    else:
        print('❌ responder@demo.com user not found')
finally:
    db.close()
"

echo ""
echo "5. 🚀 Testing API endpoint..."
echo "Starting temporary server test..."

# Start server in background for testing
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test login endpoint
echo "Testing login endpoint..."
curl -X POST "http://127.0.0.1:8001/auth/login-json" \
     -H "Content-Type: application/json" \
     -d '{"email": "responder@demo.com", "password": "demo123"}' \
     -w "\nHTTP Status: %{http_code}\n"

# Kill test server
kill $SERVER_PID

echo ""
echo "✅ Quick fix completed!"
echo ""
echo "If authentication still fails:"
echo "1. Check that PostgreSQL is running"
echo "2. Verify DATABASE_URL in .env file"
echo "3. Run: python scripts/seed_db.py"
echo "4. Check backend logs for detailed errors"