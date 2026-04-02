const db = require('../db');

module.exports = async (req, res, next) => {
  try {
    const result = await db.query('SELECT is_admin FROM users WHERE id=$1', [req.user.id]);
    if (!result.rows.length || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
