const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET all savings goals
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM savings_goals WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE goal
router.post('/', auth, async (req, res) => {
  try {
    const { name, target_amount, current_amount = 0, deadline, icon, color } = req.body;
    const result = await db.query(
      `INSERT INTO savings_goals(user_id, name, target_amount, current_amount, deadline, icon, color)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name, target_amount, current_amount || 0, deadline || null, icon || 'target', color || '#4f46e5']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE goal (add money or edit)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, target_amount, current_amount, deadline, icon, color } = req.body;
    const result = await db.query(
      `UPDATE savings_goals SET name=COALESCE($1,name), target_amount=COALESCE($2,target_amount),
       current_amount=COALESCE($3,current_amount), deadline=COALESCE($4,deadline),
       icon=COALESCE($5,icon), color=COALESCE($6,color), updated_at=NOW()
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, target_amount, current_amount, deadline, icon, color, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add money to goal
router.post('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await db.query(
      `UPDATE savings_goals SET current_amount = current_amount + $1, updated_at=NOW()
       WHERE id=$2 AND user_id=$3 RETURNING *`,
      [amount, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE goal
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
