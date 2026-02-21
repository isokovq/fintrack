# 💰 FinTrack — Personal Finance Management App

A full-stack fintech app built with React + Node.js + PostgreSQL + Claude AI.

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

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- An Anthropic API key (from console.anthropic.com)

### 1. Clone & Install
```bash
git clone https://github.com/isokovq/fintrack.git
cd fintrack
bash setup.sh
```

### 2. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE fintrack;"
psql -U postgres -d fintrack -f backend/schema.sql
```

### 3. Configure Environment
Edit `backend/.env`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fintrack
JWT_SECRET=any_random_long_string
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```
Open **http://localhost:3000**

---

## 🚢 Deploy to Railway (Recommended)

Railway gives you a PostgreSQL database + hosting with one click.

### Step-by-step:

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub.

2. **Create a new project** → "Deploy from GitHub repo" → Select `isokovq/fintrack`.

3. **Add a PostgreSQL database:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-creates `DATABASE_URL` for you

4. **Set environment variables** on the fintrack service:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | (auto-linked from PostgreSQL) |
   | `JWT_SECRET` | Any random string (e.g. `mysupersecretkey123`) |
   | `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
   | `NODE_ENV` | `production` |

5. **Run the database schema** — In Railway's PostgreSQL service, open the "Data" tab → "Query" and paste the contents of `backend/schema.sql`, then run it.

6. **Deploy!** Railway auto-builds from the Dockerfile and gives you a public URL like `fintrack-production.up.railway.app`.

7. **Share the URL** with friends — they can register and use it instantly!

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

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire in 30 days
- All API routes are protected with auth middleware
- Database queries use parameterized statements (no SQL injection)

---

## 📁 Project Structure

```
fintrack/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # AI & cron services
│   │   ├── middleware/ # JWT auth
│   │   └── index.js   # Entry point (serves frontend in prod)
│   └── schema.sql     # PostgreSQL schema
├── frontend/          # React + Vite app
│   └── src/
│       ├── pages/     # All page components
│       ├── components/ # Reusable UI components
│       ├── context/   # Auth context
│       └── utils/     # Helpers & API client
├── Dockerfile         # Production build
├── railway.toml       # Railway deployment config
└── setup.sh           # Quick local setup
```
