#!/bin/bash
# FinTrack Quick Setup Script

set -e
echo "🚀 Setting up FinTrack..."

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created backend/.env — Please edit it with your database and API credentials!"
fi

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created frontend/.env"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Set up PostgreSQL: psql -U postgres -c 'CREATE DATABASE fintrack;'"
echo "   2. Run schema: psql -U postgres -d fintrack -f backend/schema.sql"
echo "   3. Edit backend/.env with your DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY"
echo "   4. Start backend:  cd backend && npm run dev"
echo "   5. Start frontend: cd frontend && npm run dev"
echo ""
echo "🌐 App will be available at http://localhost:3000"
echo ""
echo "🚢 For production deployment:"
echo "   cd frontend && npm run build"
echo "   cd ../backend && NODE_ENV=production node src/index.js"
echo "   App runs at http://localhost:5000"
