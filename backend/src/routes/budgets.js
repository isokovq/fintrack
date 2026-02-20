const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET budgets for a month with actual spending
router.get('/', auth, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const budgets = await db.query(
      `SELECT b.*, c.name as category_name, c.icon, c.color,
              COALESCE(spent.total, 0) as spent_amount
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN (
         SELECT category_id, SUM(amount) as total
         FROM transactions
         WHERE user_id=$1 AND type='expense'
           AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY category_id
       ) spent ON spent.category_id = b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3
       ORDER BY c.name`,
      [req.user.id, month, year]
    );

    const incomeBudget = await db.query(
      `SELECT ib.*, 
              COALESCE(actual.total, 0) as actual_income
       FROM income_budgets ib
       LEFT JOIN (
         SELECT SUM(amount) as total FROM transactions
         WHERE user_id=$1 AND type='income'
           AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       ) actual ON true
       WHERE ib.user_id=$1 AND ib.month=$2 AND ib.year=$3`,
      [req.user.id, month, year]
    );

    res.json({ budgets: budgets.rows, incomeBudget: incomeBudget.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SET/UPDATE budget for category
router.post('/', auth, async (req, res) => {
  try {
    const { category_id, month = new Date().getMonth() + 1, year = new Date().getFullYear(), limit_amount } = req.body;
    const result = await db.query(
      `INSERT INTO budgets(user_id, category_id, month, year, limit_amount)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(user_id, category_id, month, year) DO UPDATE SET limit_amount=$5
       RETURNING *`,
      [req.user.id, category_id, month, year, limit_amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE budget
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM budgets WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SET income budget
router.post('/income', auth, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), target_amount } = req.body;
    const result = await db.query(
      `INSERT INTO income_budgets(user_id, month, year, target_amount)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id, month, year) DO UPDATE SET target_amount=$4
       RETURNING *`,
      [req.user.id, month, year, target_amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
