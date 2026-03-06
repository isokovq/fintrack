const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Calculate next payment date based on last date + interval
function calcNextDate(lastDate, interval) {
  const d = new Date(lastDate);
  switch (interval) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

// Calculate monthly equivalent amount
function monthlyEquivalent(amount, interval) {
  switch (interval) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

// GET /api/recurring — all recurring transactions with next payment dates
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
        a.name as account_name, a.currency as account_currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.user_id=$1 AND t.is_recurring=true
      ORDER BY t.date DESC
    `, [req.user.id]);

    // Group by description+category+amount to find unique subscriptions
    // and compute next payment date from the latest transaction in each group
    const subsMap = {};
    for (const tx of result.rows) {
      const key = `${tx.description}-${tx.category_id}-${tx.amount}-${tx.recurring_interval}`;
      if (!subsMap[key] || new Date(tx.date) > new Date(subsMap[key].date)) {
        subsMap[key] = tx;
      }
    }

    const subscriptions = Object.values(subsMap).map(tx => ({
      id: tx.id,
      description: tx.description,
      amount: parseFloat(tx.amount),
      type: tx.type,
      interval: tx.recurring_interval || 'monthly',
      last_payment_date: tx.date,
      next_payment_date: calcNextDate(tx.date, tx.recurring_interval || 'monthly'),
      category_name: tx.category_name,
      category_color: tx.category_color,
      category_icon: tx.category_icon,
      account_name: tx.account_name,
      account_currency: tx.account_currency,
      account_id: tx.account_id,
      category_id: tx.category_id,
    }));

    // Sort by next payment date
    subscriptions.sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date));

    const totalMonthly = subscriptions
      .filter(s => s.type === 'expense')
      .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.interval), 0);

    res.json({
      subscriptions,
      total_monthly_commitment: Math.round(totalMonthly * 100) / 100,
      active_count: subscriptions.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/recurring/:id/cancel — stop a recurring transaction
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE transactions SET is_recurring=false WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
