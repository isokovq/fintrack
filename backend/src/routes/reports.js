const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET /api/reports/monthly-summary?year=2026
// Returns income/expense/savings for each month of the year
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM date)::int as month,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `, [req.user.id, year]);

    // Fill all 12 months (even empty ones)
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const row = result.rows.find(r => r.month === m);
      const income = parseFloat(row?.income || 0);
      const expense = parseFloat(row?.expense || 0);
      months.push({ month: m, income, expense, savings: income - expense });
    }

    res.json({ year, months });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/category-trends?months=6
// Returns per-category spending for last N months
router.get('/category-trends', auth, async (req, res) => {
  try {
    const monthsBack = parseInt(req.query.months) || 6;
    const result = await db.query(`
      SELECT
        c.name, c.color, c.icon,
        TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM') as month,
        SUM(t.amount) as amount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id=$1 AND t.type='expense'
        AND t.date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * ($2 - 1)
      GROUP BY c.name, c.color, c.icon, DATE_TRUNC('month', t.date)
      ORDER BY c.name, month
    `, [req.user.id, monthsBack]);

    // Group by category
    const catMap = {};
    for (const row of result.rows) {
      if (!catMap[row.name]) {
        catMap[row.name] = { name: row.name, color: row.color, icon: row.icon, trend: [] };
      }
      catMap[row.name].trend.push({ month: row.month, amount: parseFloat(row.amount) });
    }

    // Sort by total spending (top categories first), take top 8
    const categories = Object.values(catMap)
      .map(c => ({ ...c, total: c.trend.reduce((s, t) => s + t.amount, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    res.json({ monthsBack, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/net-worth
// Returns monthly net worth (cumulative balance) over last 12 months
router.get('/net-worth', auth, async (req, res) => {
  try {
    // Get initial total balance (sum of all account starting balances minus all transactions to get the base)
    // Simpler approach: compute cumulative income - expense per month
    const result = await db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id=$1 AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month
    `, [req.user.id]);

    // Get current total balance from accounts
    const accResult = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id=$1',
      [req.user.id]
    );
    const currentBalance = parseFloat(accResult.rows[0].total);

    // Work backwards from current balance to compute historical balances
    const monthlyChanges = result.rows.map(r => ({
      month: r.month,
      change: parseFloat(r.income) - parseFloat(r.expense)
    }));

    // Calculate running balance backwards
    const netWorth = [];
    let balance = currentBalance;

    // Build forward from oldest month
    // First, subtract all monthly changes from current to get the starting point
    let startBalance = currentBalance;
    for (const mc of monthlyChanges) {
      startBalance -= mc.change;
    }

    // Now build forward
    let running = startBalance;
    for (const mc of monthlyChanges) {
      running += mc.change;
      netWorth.push({ month: mc.month, balance: Math.round(running * 100) / 100 });
    }

    res.json({ netWorth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
