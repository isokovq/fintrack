const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const { status, direction } = req.query;
    let conditions = ['user_id=$1'];
    let params = [req.user.id];
    let i = 2;

    if (status) { conditions.push(`status=$${i++}`); params.push(status); }
    if (direction) { conditions.push(`direction=$${i++}`); params.push(direction); }

    const result = await db.query(
      `SELECT * FROM debts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { contact_name, amount, description, due_date, direction } = req.body;
    const result = await db.query(
      `INSERT INTO debts(user_id, contact_name, amount, remaining_amount, description, due_date, direction)
       VALUES($1,$2,$3,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, contact_name, amount, description, due_date, direction]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partial payment
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const debt = await db.query('SELECT * FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!debt.rows.length) return res.status(404).json({ error: 'Not found' });

    const d = debt.rows[0];
    const newRemaining = Math.max(0, parseFloat(d.remaining_amount) - parseFloat(amount));
    const newStatus = newRemaining === 0 ? 'CLOSED' : 'OPEN';

    const result = await db.query(
      'UPDATE debts SET remaining_amount=$1, status=$2 WHERE id=$3 RETURNING *',
      [newRemaining, newStatus, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { contact_name, description, due_date, status } = req.body;
    const result = await db.query(
      `UPDATE debts SET 
        contact_name=COALESCE($1,contact_name),
        description=COALESCE($2,description),
        due_date=COALESCE($3,due_date),
        status=COALESCE($4,status)
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [contact_name, description, due_date, status, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
