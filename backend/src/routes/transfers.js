const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT tr.*, 
              fa.name as from_account_name, fa.currency as from_currency,
              ta.name as to_account_name, ta.currency as to_currency
       FROM transfers tr
       LEFT JOIN accounts fa ON fa.id = tr.from_account_id
       LEFT JOIN accounts ta ON ta.id = tr.to_account_id
       WHERE tr.user_id=$1
       ORDER BY tr.date DESC, tr.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { from_account_id, to_account_id, amount, exchange_rate = 1, description, date } = req.body;

    if (from_account_id === to_account_id) {
      return res.status(400).json({ error: 'Cannot transfer to same account' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Verify both accounts belong to user
      const accounts = await client.query(
        'SELECT id, balance, currency FROM accounts WHERE id=ANY($1) AND user_id=$2',
        [[from_account_id, to_account_id], req.user.id]
      );
      if (accounts.rows.length < 2) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Invalid accounts' });
      }

      const fromAcc = accounts.rows.find(a => a.id === from_account_id);
      if (parseFloat(fromAcc.balance) < parseFloat(amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Deduct from source
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [amount, from_account_id]);
      // Add to destination (with exchange rate)
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [amount * exchange_rate, to_account_id]);

      const result = await client.query(
        `INSERT INTO transfers(user_id, from_account_id, to_account_id, amount, exchange_rate, description, date)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.user.id, from_account_id, to_account_id, amount, exchange_rate, description, date || new Date()]
      );

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
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

// Edit transfer — reverse old balances, apply new ones
router.put('/:id', auth, async (req, res) => {
  try {
    const { from_account_id, to_account_id, amount, exchange_rate = 1, description, date } = req.body;

    if (from_account_id === to_account_id) {
      return res.status(400).json({ error: 'Cannot transfer to same account' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get old transfer
      const old = await client.query('SELECT * FROM transfers WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (old.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transfer not found' });
      }
      const oldT = old.rows[0];

      // Reverse old transfer balances
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [oldT.amount, oldT.from_account_id]);
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [oldT.amount * oldT.exchange_rate, oldT.to_account_id]);

      // Verify new accounts belong to user
      const accounts = await client.query(
        'SELECT id, balance, currency FROM accounts WHERE id=ANY($1) AND user_id=$2',
        [[from_account_id, to_account_id], req.user.id]
      );
      if (accounts.rows.length < 2) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Invalid accounts' });
      }

      const fromAcc = accounts.rows.find(a => a.id === from_account_id);
      if (parseFloat(fromAcc.balance) < parseFloat(amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Apply new transfer balances
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [amount, from_account_id]);
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [amount * exchange_rate, to_account_id]);

      // Update transfer record
      const result = await client.query(
        `UPDATE transfers SET from_account_id=$1, to_account_id=$2, amount=$3, exchange_rate=$4, description=$5, date=$6
         WHERE id=$7 AND user_id=$8 RETURNING *`,
        [from_account_id, to_account_id, amount, exchange_rate, description, date || new Date(), req.params.id, req.user.id]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
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

// Delete transfer — reverse balances
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const old = await client.query('SELECT * FROM transfers WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (old.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transfer not found' });
      }
      const oldT = old.rows[0];

      // Reverse balances
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [oldT.amount, oldT.from_account_id]);
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [oldT.amount * oldT.exchange_rate, oldT.to_account_id]);

      await client.query('DELETE FROM transfers WHERE id=$1', [req.params.id]);

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

module.exports = router;
