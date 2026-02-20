#!/bin/bash
# FinTrack Quick Setup Script

echo "🚀 Setting up FinTrack..."

# Backend
echo "\n📦 Installing backend dependencies..."
cd backend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created backend/.env — Please edit it with your database and API credentials!"
fi

# Frontend
echo "\n📦 Installing frontend dependencies..."
cd ../frontend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created frontend/.env"
fi

echo "\n✅ Setup complete!"
echo "\n📝 Next steps:"
echo "   1. Set up PostgreSQL: psql -U postgres -d fintrack -f backend/schema.sql"
echo "   2. Edit backend/.env with your DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY"
echo "   3. Start backend:  cd backend && npm run dev"
echo "   4. Start frontend: cd frontend && npm start"
echo "\n🌐 App will be available at http://localhost:3000"
