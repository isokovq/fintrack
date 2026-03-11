# FinTrack — Personal Finance Management App

A full-stack personal finance management application built with React, Node.js, Express, and PostgreSQL. Features multi-currency support with real-time exchange rates from the Central Bank of Uzbekistan, AI-powered spending insights, family sharing, and comprehensive financial analytics.

## Features

**Core Finance Management**
- Multi-account tracking (bank accounts, cards, cash wallets) with automatic balance updates
- Income and expense tracking with smart category detection
- Inter-account transfers with built-in currency conversion (UZS, USD, EUR, etc.)
- Monthly budget planning with per-category spending limits and income targets
- Debt and loan tracker with due dates and partial payment support

**Analytics & Reporting**
- Interactive dashboard with animated statistics and spending trends
- Reports page with monthly breakdown charts, category trend analysis, and net worth tracking
- Calendar view showing daily income/expense breakdown
- PDF export for financial reports

**Recurring Payments**
- Subscription and recurring payment management
- Automatic transaction creation via scheduled cron jobs
- Monthly commitment overview with next payment tracking

**Smart Features**
- AI-powered financial assistant for spending analysis and advice
- Automatic transaction categorization using natural language processing
- Smart notifications: budget alerts, overdue debt reminders, monthly summaries
- Real-time currency exchange rates from CBU (Central Bank of Uzbekistan)

**Collaboration & Localization**
- Family group sharing with invite codes
- Multi-language support: English, Russian, Uzbek
- Dark/Light theme toggle
- Fully responsive design for mobile and desktop

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, React Router, TanStack React Query, Recharts |
| Backend | Node.js, Express, PostgreSQL (pg), JWT Authentication |
| AI | Anthropic Claude API |
| Deployment | Docker, Railway |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

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
Create `backend/.env`:
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

## Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Create a new project → "Deploy from GitHub repo" → select `isokovq/fintrack`
3. Add a PostgreSQL database: "New" → "Database" → "PostgreSQL"
4. Set environment variables on the fintrack service:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-linked from PostgreSQL |
| `JWT_SECRET` | Any random string |
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `NODE_ENV` | `production` |

5. Run `backend/schema.sql` in Railway's PostgreSQL query tab
6. Deploy — Railway auto-builds from the Dockerfile

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Accounts & Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/transactions` | List transactions (filterable) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/stats/summary` | Summary statistics |
| GET | `/api/transactions/stats/trend` | 12-month trend data |
| GET | `/api/transactions/calendar/:year/:month` | Calendar data |
| POST | `/api/transfers` | Create inter-account transfer |

### Budgets & Debts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | Get budgets with actual spending |
| POST | `/api/budgets` | Set budget limit |
| POST | `/api/budgets/income` | Set income target |
| GET | `/api/debts` | List debts |
| POST | `/api/debts` | Add debt |
| POST | `/api/debts/:id/pay` | Record payment |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/monthly-summary` | Monthly income/expense/savings |
| GET | `/api/reports/category-trends` | Per-category spending trends |
| GET | `/api/reports/net-worth` | Net worth over time |
| GET | `/api/recurring` | List recurring payments |
| PUT | `/api/recurring/:id/cancel` | Cancel recurring payment |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories |
| GET | `/api/exchange-rates` | Live CBU exchange rates |
| POST | `/api/family/create` | Create family group |
| POST | `/api/family/join` | Join family with code |
| GET | `/api/family` | Get family info |
| GET | `/api/ai/insights` | AI spending insights |
| POST | `/api/ai/chat` | Chat with AI advisor |
| POST | `/api/ai/suggest-category` | AI category suggestion |
| GET | `/api/notifications` | Get notifications |

## Project Structure

```
fintrack/
├── backend/
│   ├── src/
│   │   ├── routes/         # API endpoint handlers
│   │   ├── services/       # AI, cron jobs, exchange rates
│   │   ├── middleware/      # JWT authentication
│   │   └── index.js        # Express server entry point
│   └── schema.sql          # PostgreSQL database schema
├── frontend/
│   └── src/
│       ├── pages/          # Page components (13 pages)
│       ├── components/     # Reusable UI components
│       ├── context/        # Auth, Language, Theme providers
│       ├── translations.js # i18n strings (EN/RU/UZ)
│       └── utils/          # API client, formatters
├── Dockerfile              # Production multi-stage build
├── railway.toml            # Railway deployment config
└── setup.sh                # Local setup script
```

## Security

- Passwords hashed with bcrypt
- JWT tokens with 30-day expiration
- All API routes protected with authentication middleware
- Parameterized database queries (SQL injection prevention)

## Author

**Kakhramon Isokov** — [github.com/isokovq](https://github.com/isokovq)
