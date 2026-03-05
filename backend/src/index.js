require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startCronJobs } = require('./services/cron');
const db = require('./db');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/family', require('./routes/family'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/exchange-rates', require('./routes/exchangeRates'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// Run migrations on startup
async function runMigrations() {
  try {
    // Create migrations tracking table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations_run (
        filename VARCHAR(255) PRIMARY KEY,
        ran_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const already = await db.query('SELECT 1 FROM migrations_run WHERE filename=$1', [file]);
      if (already.rows.length === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await db.query(sql);
        await db.query('INSERT INTO migrations_run(filename) VALUES($1)', [file]);
        console.log(`Migration applied: ${file}`);
      }
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

// Ensure all default categories exist and remove duplicates (runs every startup)
async function seedDefaultCategories() {
  const defaults = [
    { name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#ef4444' },
    { name: 'Transportation', type: 'expense', icon: 'car', color: '#f97316' },
    { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#eab308' },
    { name: 'Entertainment', type: 'expense', icon: 'tv', color: '#8b5cf6' },
    { name: 'Healthcare', type: 'expense', icon: 'heart', color: '#ec4899' },
    { name: 'Housing', type: 'expense', icon: 'home', color: '#06b6d4' },
    { name: 'Education', type: 'expense', icon: 'book', color: '#3b82f6' },
    { name: 'Utilities', type: 'expense', icon: 'zap', color: '#14b8a6' },
    { name: 'Travel', type: 'expense', icon: 'plane', color: '#a855f7' },
    { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#22c55e' },
    { name: 'Sports & Nutrition', type: 'expense', icon: 'dumbbell', color: '#f97316' },
    { name: 'Baby Expenses', type: 'expense', icon: 'baby', color: '#f472b6' },
    { name: 'Presents', type: 'expense', icon: 'gift', color: '#f59e0b' },
    { name: 'Gifts', type: 'expense', icon: 'gift', color: '#e879f9' },
    { name: 'Wife Expenses', type: 'expense', icon: 'heart', color: '#e879f9' },
    { name: 'Extended Family', type: 'expense', icon: 'users', color: '#fb923c' },
    { name: 'Work Expenses', type: 'expense', icon: 'briefcase', color: '#64748b' },
    { name: 'Other Expense', type: 'expense', icon: 'more-horizontal', color: '#6b7280' },
    { name: 'Salary', type: 'income', icon: 'briefcase', color: '#22c55e' },
    { name: 'Freelance', type: 'income', icon: 'laptop', color: '#10b981' },
    { name: 'Investment', type: 'income', icon: 'trending-up', color: '#06b6d4' },
    { name: 'Gift', type: 'income', icon: 'gift', color: '#f59e0b' },
    { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6b7280' },
  ];

  try {
    // Step 1: Remove duplicate default categories — keep only the oldest one per name
    await db.query(`
      DELETE FROM categories c
      WHERE user_id IS NULL AND is_default = true
        AND EXISTS (
          SELECT 1 FROM categories c2
          WHERE c2.name = c.name AND c2.user_id IS NULL AND c2.is_default = true
            AND c2.id <> c.id
            AND c2.id < c.id
        )
    `);

    // Step 2: Insert any missing categories
    for (const cat of defaults) {
      const exists = await db.query(
        'SELECT 1 FROM categories WHERE name=$1 AND user_id IS NULL', [cat.name]
      );
      if (exists.rows.length === 0) {
        await db.query(
          'INSERT INTO categories(user_id, name, type, icon, color, is_default) VALUES(NULL, $1, $2, $3, $4, true)',
          [cat.name, cat.type, cat.icon, cat.color]
        );
        console.log(`Seeded category: ${cat.name}`);
      }
    }
  } catch (err) {
    console.error('Category seed error:', err.message);
  }
}

const PORT = process.env.PORT || 5000;
runMigrations().then(() => seedDefaultCategories()).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinTrack running on port ${PORT}`);
    startCronJobs();
  });
});
