# 💰 FinTrack — Personal Finance Management App

A full-stack fintech MVP built with React + Node.js + PostgreSQL + Claude AI.

## 🚀 Features

- **Accounts & Cards** — Add bank accounts, cards, cash wallets with auto balance tracking
- **Transactions** — Income & expense tracking with AI-powered category detection
- **Transfers** — Move money between accounts with currency conversion support
- **Budget Planning** — Monthly spending limits per category + income targets
- **Debts & Loans** — Track money lent/borrowed with due dates and payment tracking
- **Calendar View** — Visual daily breakdown of income/expenses
- **Family Sharing** — Invite family members and share financial overview
- **AI Assistant** — Claude-powered chat & automated spending insights
- **Smart Notifications** — Budget alerts, overdue debt reminders, monthly summaries

---

## 📁 Project Structure

```
fintrack/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # AI & cron services
│   │   ├── middleware/
│   │   └── index.js  # Entry point
│   └── schema.sql    # PostgreSQL schema
└── frontend/          # React app
    └── src/
        ├── pages/     # All page components
        ├── components/ # Reusable UI components
        ├── context/   # Auth context
        └── utils/     # Helpers & API client
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+
- An Anthropic API key (from console.anthropic.com)

### 2. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE fintrack;"

# Run schema
psql -U postgres -d fintrack -f backend/schema.sql
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and fill in:
#   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fintrack
#   JWT_SECRET=any_random_long_string
#   ANTHROPIC_API_KEY=sk-ant-...

# Start backend
npm run dev
# → API running on http://localhost:5000
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# REACT_APP_API_URL=http://localhost:5000/api

# Start frontend
npm start
# → App running on http://localhost:3000
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Create transaction (AI auto-categorizes) |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/stats/summary` | Summary stats |
| GET | `/api/transactions/stats/trend` | 12-month trend |
| GET | `/api/transactions/calendar/:year/:month` | Calendar data |
| POST | `/api/transfers` | Create transfer |
| GET | `/api/budgets` | Get budgets with actual spending |
| POST | `/api/budgets` | Set budget limit |
| POST | `/api/budgets/income` | Set income target |
| GET | `/api/debts` | List debts |
| POST | `/api/debts` | Add debt |
| POST | `/api/debts/:id/pay` | Record payment |
| GET | `/api/categories` | List categories |
| POST | `/api/family/create` | Create family group |
| POST | `/api/family/join` | Join family with code |
| GET | `/api/family` | Get family info |
| GET | `/api/ai/insights` | Get AI spending insights |
| POST | `/api/ai/chat` | Chat with AI advisor |
| POST | `/api/ai/suggest-category` | AI category suggestion |
| GET | `/api/notifications` | Get notifications |

---

## 🤖 AI Features (Claude Integration)

1. **Auto-categorization** — When adding a transaction with a description, Claude automatically suggests the best category
2. **Spending Insights** — Analyzes 3 months of history and generates personalized financial insights
3. **AI Chat** — Ask anything about your finances; Claude has context of your current financial state

### Changing AI Model
In `backend/src/services/ai.js`, the model is set to `claude-sonnet-4-20250514`.
You can change it to any available Claude model.

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire in 30 days
- All API routes are protected with auth middleware
- Database queries use parameterized statements (no SQL injection)

---

## 📈 Future Enhancements

- [ ] CSV/PDF export
- [ ] Recurring transaction automation
- [ ] Push notifications (Firebase)
- [ ] Mobile app (React Native)
- [ ] Multi-currency dashboard
- [ ] Receipt scanning with AI OCR
