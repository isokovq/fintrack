const router = require('express').Router();
const auth = require('../middleware/auth');
const { getRates } = require('../services/exchangeRates');

// GET /api/exchange-rates - returns all CBU rates (currency -> UZS)
router.get('/', auth, async (req, res) => {
  try {
    const rates = await getRates();
    res.json({
      base: 'UZS',
      date: new Date().toISOString().split('T')[0],
      rates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
