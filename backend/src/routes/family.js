const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

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

// Get family info + members
router.get('/', auth, async (req, res) => {
  try {
    const user = await db.query('SELECT family_id FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0].family_id) return res.json(null);

    const family = await db.query('SELECT * FROM families WHERE id=$1', [user.rows[0].family_id]);
    const members = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE family_id=$1',
      [user.rows[0].family_id]
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
      [user.rows[0].family_id]
    );

    res.json({ ...family.rows[0], members: members.rows, stats: stats.rows[0] });
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

module.exports = router;
