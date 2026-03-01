const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Initialize shared_expenses table if not exists
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS shared_expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        family_id UUID REFERENCES families(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id),
        description TEXT NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        settled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS shared_expense_splits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        expense_id UUID REFERENCES shared_expenses(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        is_paid BOOLEAN DEFAULT false
      )
    `);
  } catch (e) { /* table might already exist */ }
})();

// Create family
router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const family = await db.query(
      'INSERT INTO families(name, owner_id, invite_code) VALUES($1,$2,$3) RETURNING *',
      [name, req.user.id, inviteCode]
    );

    await db.query('UPDATE users SET family_id=$1 WHERE id=$2', [family.rows[0].id, req.user.id]);
    res.status(201).json(family.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join family with invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { invite_code } = req.body;
    const family = await db.query('SELECT * FROM families WHERE invite_code=$1', [invite_code]);
    if (!family.rows.length) return res.status(404).json({ error: 'Invalid invite code' });

    await db.query('UPDATE users SET family_id=$1 WHERE id=$2', [family.rows[0].id, req.user.id]);
    res.json(family.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get family info + members + per-member stats
router.get('/', auth, async (req, res) => {
  try {
    const user = await db.query('SELECT family_id, currency FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0].family_id) return res.json(null);

    const familyId = user.rows[0].family_id;
    const family = await db.query('SELECT * FROM families WHERE id=$1', [familyId]);
    const members = await db.query(
      'SELECT id, name, email, currency, created_at FROM users WHERE family_id=$1',
      [familyId]
    );

    // Family combined stats
    const stats = await db.query(
      `SELECT
        SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as total_expense
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE u.family_id=$1
       AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [familyId]
    );

    // Per-member stats this month
    const memberStats = await db.query(
      `SELECT t.user_id,
        SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as expense,
        COUNT(*) as tx_count
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE u.family_id=$1
       AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY t.user_id`,
      [familyId]
    );

    // Top categories across family
    const topCategories = await db.query(
      `SELECT c.name, c.color, SUM(t.amount) as total
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE u.family_id=$1 AND t.type='expense'
       AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY c.name, c.color
       ORDER BY total DESC LIMIT 5`,
      [familyId]
    );

    const memberStatsMap = {};
    memberStats.rows.forEach(s => { memberStatsMap[s.user_id] = s; });

    const membersWithStats = members.rows.map(m => ({
      ...m,
      stats: memberStatsMap[m.id] || { income: 0, expense: 0, tx_count: 0 }
    }));

    res.json({
      ...family.rows[0],
      members: membersWithStats,
      stats: stats.rows[0],
      topCategories: topCategories.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave family
router.post('/leave', auth, async (req, res) => {
  try {
    await db.query('UPDATE users SET family_id=NULL WHERE id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SHARED EXPENSES =====

// Create shared expense
router.post('/expenses', auth, async (req, res) => {
  try {
    const user = await db.query('SELECT family_id, currency FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0].family_id) return res.status(400).json({ error: 'Not in a family' });

    const { description, total_amount, splits, date } = req.body;
    const familyId = user.rows[0].family_id;

    const expense = await db.query(
      'INSERT INTO shared_expenses(family_id, created_by, description, total_amount, currency, date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [familyId, req.user.id, description, total_amount, user.rows[0].currency, date || new Date()]
    );

    // Create splits for each member
    for (const split of splits) {
      await db.query(
        'INSERT INTO shared_expense_splits(expense_id, user_id, amount, is_paid) VALUES($1,$2,$3,$4)',
        [expense.rows[0].id, split.user_id, split.amount, split.user_id === req.user.id]
      );
    }

    res.status(201).json(expense.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get shared expenses for family
router.get('/expenses', auth, async (req, res) => {
  try {
    const user = await db.query('SELECT family_id FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0].family_id) return res.json([]);

    const expenses = await db.query(
      `SELECT se.*, u.name as created_by_name
       FROM shared_expenses se
       JOIN users u ON u.id = se.created_by
       WHERE se.family_id=$1
       ORDER BY se.date DESC, se.created_at DESC
       LIMIT 50`,
      [user.rows[0].family_id]
    );

    // Get splits for each expense
    for (const exp of expenses.rows) {
      const splits = await db.query(
        `SELECT ses.*, u.name as user_name
         FROM shared_expense_splits ses
         JOIN users u ON u.id = ses.user_id
         WHERE ses.expense_id=$1`,
        [exp.id]
      );
      exp.splits = splits.rows;
    }

    res.json(expenses.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a split as paid
router.put('/expenses/:expenseId/pay/:userId', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE shared_expense_splits SET is_paid=true WHERE expense_id=$1 AND user_id=$2',
      [req.params.expenseId, req.params.userId]
    );

    // Check if all splits are paid
    const unpaid = await db.query(
      'SELECT COUNT(*) FROM shared_expense_splits WHERE expense_id=$1 AND is_paid=false',
      [req.params.expenseId]
    );

    if (parseInt(unpaid.rows[0].count) === 0) {
      await db.query('UPDATE shared_expenses SET settled=true WHERE id=$1', [req.params.expenseId]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get balance summary (who owes whom)
router.get('/balances', auth, async (req, res) => {
  try {
    const user = await db.query('SELECT family_id FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0].family_id) return res.json([]);

    // Calculate net balances: what each person owes vs what they paid for
    const balances = await db.query(
      `SELECT
        ses.user_id,
        u.name as user_name,
        SUM(CASE WHEN ses.is_paid = false THEN ses.amount ELSE 0 END) as owes,
        SUM(CASE WHEN se.created_by = ses.user_id THEN se.total_amount - ses.amount ELSE 0 END) as owed_to_them
       FROM shared_expense_splits ses
       JOIN shared_expenses se ON se.id = ses.expense_id
       JOIN users u ON u.id = ses.user_id
       WHERE se.family_id=$1 AND se.settled=false
       GROUP BY ses.user_id, u.name`,
      [user.rows[0].family_id]
    );

    res.json(balances.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
