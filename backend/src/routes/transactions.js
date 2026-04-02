const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');
const aiService = require('../services/ai');

// GET transactions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { type, account_id, category_id, start_date, end_date, limit = 50, offset = 0 } = req.query;
    let conditions = ['t.user_id=$1'];
    let params = [req.user.id];
    let i = 2;

    if (type) { conditions.push(`t.type=$${i++}`); params.push(type); }
    if (account_id) { conditions.push(`t.account_id=$${i++}`); params.push(account_id); }
    if (category_id) { conditions.push(`t.category_id=$${i++}`); params.push(category_id); }
    if (start_date) { conditions.push(`t.date>=$${i++}`); params.push(start_date); }
    if (end_date) { conditions.push(`t.date<=$${i++}`); params.push(end_date); }

    const where = conditions.join(' AND ');
    const result = await db.query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name, a.type as account_type
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts a ON a.id = t.account_id
       WHERE ${where}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${where}`,
      params
    );

    res.json({ transactions: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE transaction
router.post('/', auth, async (req, res) => {
  try {
    const { account_id, category_id, type, amount, description, date, is_recurring, recurring_interval } = req.body;

    let finalCategoryId = category_id;
    let aiSuggested = false;

    // AI category detection if no category provided
    if (!category_id && description) {
      try {
        const suggested = await aiService.suggestCategory(description, type, req.user.id);
        if (suggested) { finalCategoryId = suggested; aiSuggested = true; }
      } catch (e) { /* continue without AI */ }
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO transactions(user_id, account_id, category_id, type, amount, description, date, is_recurring, recurring_interval, ai_suggested_category)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.user.id, account_id, finalCategoryId, type, amount, description, date || new Date(), is_recurring, recurring_interval, aiSuggested]
      );

      // Update account balance
      if (account_id) {
        const balanceChange = type === 'income' ? amount : -amount;
        await client.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id=$2 AND user_id=$3',
          [balanceChange, account_id, req.user.id]
        );
      }

      await client.query('COMMIT');

      // Check budget alerts asynchronously
      checkBudgetAlerts(req.user.id, finalCategoryId, type).catch(console.error);

      const full = await db.query(
        `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                a.name as account_name FROM transactions t
         LEFT JOIN categories c ON c.id=t.category_id
         LEFT JOIN accounts a ON a.id=t.account_id
         WHERE t.id=$1`, [result.rows[0].id]
      );
      res.status(201).json(full.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE transaction
router.put('/:id', auth, async (req, res) => {
  try {
    const { category_id, amount, description, date, account_id } = req.body;

    // Get old transaction to reverse balance
    const old = await db.query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!old.rows.length) return res.status(404).json({ error: 'Not found' });

    const oldTx = old.rows[0];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Reverse old balance impact
      if (oldTx.account_id) {
        const reversal = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [reversal, oldTx.account_id]);
      }

      const newAmount = amount || oldTx.amount;
      const newAccountId = account_id || oldTx.account_id;

      await client.query(
        `UPDATE transactions SET category_id=COALESCE($1,category_id), amount=$2, description=COALESCE($3,description),
         date=COALESCE($4,date), account_id=$5, updated_at=NOW() WHERE id=$6 AND user_id=$7`,
        [category_id, newAmount, description, date, newAccountId, req.params.id, req.user.id]
      );

      // Apply new balance impact
      if (newAccountId) {
        const balChange = oldTx.type === 'income' ? newAmount : -newAmount;
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [balChange, newAccountId]);
      }

      await client.query('COMMIT');
      const updated = await db.query(
        `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                a.name as account_name FROM transactions t
         LEFT JOIN categories c ON c.id=t.category_id LEFT JOIN accounts a ON a.id=t.account_id
         WHERE t.id=$1`, [req.params.id]
      );
      res.json(updated.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await db.query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!tx.rows.length) return res.status(404).json({ error: 'Not found' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const t = tx.rows[0];
      if (t.account_id) {
        const reversal = t.type === 'income' ? -t.amount : t.amount;
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [reversal, t.account_id]);
      }
      await client.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET calendar view - transactions by day
router.get('/calendar/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const result = await db.query(
      `SELECT date::text, 
              SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
              COUNT(*) as count
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3
       GROUP BY date ORDER BY date`,
      [req.user.id, year, month]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { period = 'month', year, month, week } = req.query;
    let dateFilter = '';
    const params = [req.user.id];

    if (period === 'day') {
      dateFilter = `AND date = CURRENT_DATE`;
    } else if (period === 'week') {
      dateFilter = `AND date >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (period === 'month') {
      if (year && month) {
        dateFilter = `AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3`;
        params.push(year, month);
      } else {
        dateFilter = `AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`;
      }
    } else if (period === 'year') {
      const y = year || new Date().getFullYear();
      dateFilter = `AND EXTRACT(YEAR FROM date)=$2`;
      params.push(y);
    }

    const summary = await db.query(
      `SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(CASE WHEN type='income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type='expense' THEN 1 END) as expense_count
       FROM transactions WHERE user_id=$1 ${dateFilter}`,
      params
    );

    const byCategory = await db.query(
      `SELECT c.name, c.icon, c.color, t.type,
              SUM(t.amount) as total, COUNT(*) as count
       FROM transactions t
       LEFT JOIN categories c ON c.id=t.category_id
       WHERE t.user_id=$1 ${dateFilter}
       GROUP BY c.name, c.icon, c.color, t.type
       ORDER BY total DESC`,
      params
    );

    res.json({ summary: summary.rows[0], byCategory: byCategory.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET monthly trend (12 months)
router.get('/stats/trend', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month,
              SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE user_id=$1 AND date >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY month`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check budget alerts helper
async function checkBudgetAlerts(userId, categoryId, type) {
  if (type !== 'expense' || !categoryId) return;

  const now = new Date();
  const budget = await db.query(
    'SELECT * FROM budgets WHERE user_id=$1 AND category_id=$2 AND month=$3 AND year=$4',
    [userId, categoryId, now.getMonth() + 1, now.getFullYear()]
  );
  if (!budget.rows.length) return;

  const spent = await db.query(
    `SELECT SUM(amount) as total FROM transactions 
     WHERE user_id=$1 AND category_id=$2 AND type='expense'
     AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`,
    [userId, categoryId, now.getMonth() + 1, now.getFullYear()]
  );

  const limit = parseFloat(budget.rows[0].limit_amount);
  const total = parseFloat(spent.rows[0].total || 0);
  const pct = (total / limit) * 100;

  const cat = await db.query('SELECT name FROM categories WHERE id=$1', [categoryId]);
  const catName = cat.rows[0]?.name || 'this category';

  if (pct >= 100) {
    await db.query(
      `INSERT INTO notifications(user_id, title, message, type) VALUES($1,$2,$3,$4)`,
      [userId, '🚨 Budget Exceeded', `You've exceeded your ${catName} budget for this month!`, 'danger']
    );
  } else if (pct >= 80) {
    await db.query(
      `INSERT INTO notifications(user_id, title, message, type) VALUES($1,$2,$3,$4)`,
      [userId, '⚠️ Budget Warning', `You've used ${Math.round(pct)}% of your ${catName} budget`, 'warning']
    );
  }
}

// GET /api/transactions/export/csv — export all transactions as CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let conditions = ['t.user_id=$1'];
    let params = [req.user.id];
    let i = 2;
    if (start_date) { conditions.push(`t.date>=$${i++}`); params.push(start_date); }
    if (end_date) { conditions.push(`t.date<=$${i++}`); params.push(end_date); }

    const result = await db.query(
      `SELECT t.date, t.type, t.amount, t.description,
              c.name as category, a.name as account, a.currency
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts a ON a.id = t.account_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.date DESC`,
      params
    );

    const header = 'Date,Type,Amount,Currency,Description,Category,Account\n';
    const rows = result.rows.map(r =>
      `${r.date ? r.date.toISOString().split('T')[0] : ''},${r.type},${r.amount},"${r.currency || ''}","${(r.description || '').replace(/"/g, '""')}","${r.category || ''}","${r.account || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fintrack-export.csv');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/stats/heatmap — daily spending for calendar heatmap
router.get('/stats/heatmap', auth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const result = await db.query(`
      SELECT date::date as day,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        COUNT(*) as count
      FROM transactions
      WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2
      GROUP BY date::date
      ORDER BY day
    `, [req.user.id, year]);

    res.json({ year, days: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
