-- FinTrack Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  family_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Families (for family sharing)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id);

-- Accounts & Cards
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bank', 'card', 'cash', 'savings', 'investment')),
  currency VARCHAR(10) DEFAULT 'USD',
  balance DECIMAL(15,2) DEFAULT 0,
  color VARCHAR(20) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'wallet',
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  icon VARCHAR(50) DEFAULT 'tag',
  color VARCHAR(20) DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false
);

-- Insert default categories
INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES
  (uuid_generate_v4(), NULL, 'Food & Dining', 'expense', 'utensils', '#ef4444', true),
  (uuid_generate_v4(), NULL, 'Transportation', 'expense', 'car', '#f97316', true),
  (uuid_generate_v4(), NULL, 'Shopping', 'expense', 'shopping-bag', '#eab308', true),
  (uuid_generate_v4(), NULL, 'Entertainment', 'expense', 'tv', '#8b5cf6', true),
  (uuid_generate_v4(), NULL, 'Healthcare', 'expense', 'heart', '#ec4899', true),
  (uuid_generate_v4(), NULL, 'Housing', 'expense', 'home', '#06b6d4', true),
  (uuid_generate_v4(), NULL, 'Education', 'expense', 'book', '#3b82f6', true),
  (uuid_generate_v4(), NULL, 'Utilities', 'expense', 'zap', '#14b8a6', true),
  (uuid_generate_v4(), NULL, 'Travel', 'expense', 'plane', '#a855f7', true),
  (uuid_generate_v4(), NULL, 'Groceries', 'expense', 'shopping-cart', '#22c55e', true),
  (uuid_generate_v4(), NULL, 'Sports & Nutrition', 'expense', 'dumbbell', '#f97316', true),
  (uuid_generate_v4(), NULL, 'Baby Expenses', 'expense', 'baby', '#f472b6', true),
  (uuid_generate_v4(), NULL, 'Presents', 'expense', 'gift', '#f59e0b', true),
  (uuid_generate_v4(), NULL, 'Gifts', 'expense', 'gift', '#e879f9', true),
  (uuid_generate_v4(), NULL, 'Wife Expenses', 'expense', 'heart', '#e879f9', true),
  (uuid_generate_v4(), NULL, 'Extended Family', 'expense', 'users', '#fb923c', true),
  (uuid_generate_v4(), NULL, 'Work Expenses', 'expense', 'briefcase', '#64748b', true),
  (uuid_generate_v4(), NULL, 'Other Expense', 'expense', 'more-horizontal', '#6b7280', true),
  (uuid_generate_v4(), NULL, 'Salary', 'income', 'briefcase', '#22c55e', true),
  (uuid_generate_v4(), NULL, 'Freelance', 'income', 'laptop', '#10b981', true),
  (uuid_generate_v4(), NULL, 'Investment', 'income', 'trending-up', '#06b6d4', true),
  (uuid_generate_v4(), NULL, 'Gift', 'income', 'gift', '#f59e0b', true),
  (uuid_generate_v4(), NULL, 'Other Income', 'income', 'plus-circle', '#6b7280', true);

-- Transactions (expenses + income)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval VARCHAR(20),
  ai_suggested_category BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,6) DEFAULT 1,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month INT NOT NULL,
  year INT NOT NULL,
  limit_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- Income budget (monthly income target)
CREATE TABLE income_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month INT NOT NULL,
  year INT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  UNIQUE(user_id, month, year)
);

-- Debts (money you lent out)
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  remaining_amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  due_date DATE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('lent', 'borrowed')),
  status VARCHAR(10) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_budgets_user_month ON budgets(user_id, month, year);
CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
