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

**Team Defolt** — [github.com/isokovq](https://github.com/isokovq)

https://fintrack-production-d506.up.railway.app/
