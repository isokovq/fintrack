const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let q = `SELECT * FROM categories WHERE (user_id=$1 OR is_default=true)`;
    const params = [req.user.id];
    if (type) { q += ` AND (type=$2 OR type='both')`; params.push(type); }
    q += ' ORDER BY is_default DESC, name';
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, type, icon = 'tag', color = '#6366f1' } = req.body;
    const result = await db.query(
      'INSERT INTO categories(user_id, name, type, icon, color) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, type, icon, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id=$1 AND user_id=$2 AND is_default=false', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
