set -e

echo "🚀 Setting up Emergency Flood Response System..."

# Check if Python 3.8+ is installed
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then
    echo "✅ Python $python_version is installed"
else
    echo "❌ Python 3.8+ is required. Current version: $python_version"
    exit 1
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    node_version=$(node --version | cut -d. -f1 | cut -dv -f2)
    if [ "$node_version" -ge "16" ]; then
        echo "✅ Node.js $(node --version) is installed"
    else
        echo "❌ Node.js 16+ is required. Current version: $(node --version)"
        exit 1
    fi
else
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

# Setup Backend
echo "🔧 Setting up backend..."

# Create virtual environment
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment and install dependencies
echo "📋 Installing Python dependencies..."
cd backend
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating backend .env file..."
    cat > .env << EOL
DATABASE_URL=postgresql://postgres:jaivmessi@db.yzbzlqixillvacxigdtl.supabase.co:5432/postgres
SECRET_KEY=flood-response-secret-key-2024-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
SUPABASE_URL=https://yzbzlqixillvacxigdtl.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOL
    echo "📝 Backend .env file created. Please update with your actual Supabase credentials."
fi

# Run database migrations
echo "🗄️ Running database migrations..."
alembic upgrade head

# Seed database with demo data
echo "🌱 Seeding database with demo data..."
python -c "
import sys
sys.path.append('.')
from scripts.seed_db import seed_database
seed_database()
"

cd ..

# Setup Frontend
echo "🎨 Setting up frontend..."
cd frontend

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating frontend .env file..."
    cat > .env << EOL
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://yzbzlqixillvacxigdtl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOL
    echo "📝 Frontend .env file created. Please update with your actual configuration."
fi

cd ..

# Create startup script
echo "🚀 Creating startup script..."
cat > start.sh << 'EOL'
#!/bin/bash

# Start Emergency Flood Response System

echo "🚀 Starting Emergency Flood Response System..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Trap CTRL+C and kill background processes
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ System started successfully!"
echo "🌐 Frontend: http://localhost:5174"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Demo accounts:"
echo "👤 Field Responder: responder@demo.com / demo123"
echo "👤 Command Center: command@demo.com / demo123"
echo "👤 District Officer: officer@demo.com / demo123"
echo "👤 Admin: admin@demo.com / demo123"
echo ""
echo "Press CTRL+C to stop all services"

# Wait for background processes
wait
EOL

chmod +x start.sh

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Update backend/.env with your actual Supabase credentials"
echo "2. Update frontend/.env with your configuration"
echo "3. Run './start.sh' to start the system"
echo ""
echo "🌐 Access points:"
echo "- Frontend: http://localhost:5174"
echo "- Backend API: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs"
echo ""
echo "👤 Demo accounts:"
echo "- Field Responder: responder@demo.com / demo123"
echo "- Command Center: command@demo.com / demo123"
echo "- District Officer: officer@demo.com / demo123"
echo "- Admin: admin@demo.com / demo123"