const router = require('express').Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const db = require('../db');

// All admin routes require auth + admin
router.use(auth, admin);

// GET /api/admin/stats — platform-wide stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_users_this_month,
        (SELECT COUNT(*) FROM users WHERE is_active = true OR is_active IS NULL) as active_users,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(*) FROM transactions WHERE date >= DATE_TRUNC('month', CURRENT_DATE)) as transactions_this_month,
        (SELECT COUNT(*) FROM accounts) as total_accounts,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='expense' AND date >= DATE_TRUNC('month', CURRENT_DATE)) as total_expense_this_month,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='income' AND date >= DATE_TRUNC('month', CURRENT_DATE)) as total_income_this_month,
        (SELECT COUNT(*) FROM users WHERE plan='pro') as pro_users,
        (SELECT COUNT(*) FROM users WHERE plan='free' OR plan IS NULL) as free_users
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — list all users with their stats
router.get('/users', async (req, res) => {
  try {
    const { search, plan, sort = 'created_at', order = 'DESC', limit = 50, offset = 0 } = req.query;

    let conditions = ['1=1'];
    let params = [];
    let i = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${i} OR u.email ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (plan) {
      conditions.push(`(u.plan = $${i} OR ($${i} = 'free' AND (u.plan IS NULL OR u.plan = 'free')))`);
      params.push(plan);
      i++;
    }

    const allowedSorts = ['created_at', 'name', 'email', 'tx_count', 'total_balance'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const result = await db.query(`
      SELECT
        u.id, u.name, u.email, u.currency, u.is_admin, u.plan,
        u.plan_expires_at, u.is_active, u.created_at,
        COALESCE(a.total_balance, 0) as total_balance,
        COALESCE(t.tx_count, 0) as tx_count,
        COALESCE(t.last_activity, u.created_at) as last_activity
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(balance) as total_balance FROM accounts GROUP BY user_id
      ) a ON a.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as tx_count, MAX(created_at) as last_activity FROM transactions GROUP BY user_id
      ) t ON t.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${i} OFFSET $${i + 1}
    `, [...params, limit, offset]);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM users u WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id — get a single user's full details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await db.query(`
      SELECT u.id, u.name, u.email, u.currency, u.is_admin, u.plan,
        u.plan_expires_at, u.is_active, u.created_at, u.family_id
      FROM users u WHERE u.id = $1
    `, [req.params.id]);

    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });

    const accounts = await db.query(
      'SELECT id, name, type, currency, balance FROM accounts WHERE user_id=$1 ORDER BY balance DESC',
      [req.params.id]
    );

    const recentTx = await db.query(`
      SELECT t.*, c.name as category_name FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id=$1 ORDER BY t.date DESC LIMIT 10
    `, [req.params.id]);

    const monthlyStats = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense,
        COUNT(*) as tx_count
      FROM transactions
      WHERE user_id=$1 AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    `, [req.params.id]);

    res.json({
      ...user.rows[0],
      accounts: accounts.rows,
      recent_transactions: recentTx.rows,
      monthly_stats: monthlyStats.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id — update user (plan, active status, admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { plan, is_active, is_admin, plan_expires_at } = req.body;
    const result = await db.query(`
      UPDATE users SET
        plan = COALESCE($1, plan),
        is_active = COALESCE($2, is_active),
        is_admin = COALESCE($3, is_admin),
        plan_expires_at = COALESCE($4, plan_expires_at)
      WHERE id = $5
      RETURNING id, name, email, plan, is_active, is_admin, plan_expires_at
    `, [plan, is_active, is_admin, plan_expires_at, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete user and all their data
router.delete('/users/:id', async (req, res) => {
  try {
    // Don't allow deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const result = await db.query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/growth — user growth over last 12 months
router.get('/growth', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
