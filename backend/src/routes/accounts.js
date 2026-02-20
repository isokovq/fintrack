const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET all accounts
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
        COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as total_expense
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.user_id=$1
       GROUP BY a.id
       ORDER BY a.created_at`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE account
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, currency, balance = 0, color = '#6366f1', icon = 'wallet' } = req.body;
    const result = await db.query(
      'INSERT INTO accounts(user_id, name, type, currency, balance, color, icon) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, name, type, currency, balance, color, icon]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const result = await db.query(
      'UPDATE accounts SET name=COALESCE($1,name), color=COALESCE($2,color), icon=COALESCE($3,icon) WHERE id=$4 AND user_id=$5 RETURNING *',
      [name, color, icon, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Account not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE account
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM accounts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
