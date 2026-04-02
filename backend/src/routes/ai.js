const router = require('express').Router();
const auth = require('../middleware/auth');
const aiService = require('../services/ai');

// Get AI spending insights
router.get('/insights', auth, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY.' });
    }
    const lang = req.query.lang || 'en';
    const insights = await aiService.analyzeSpending(req.user.id, lang);
    res.json(insights);
  } catch (err) {
    console.error('AI insights error:', err.message, err.status || '');
    res.status(500).json({ error: err.message });
  }
});

// AI Chat
router.post('/chat', auth, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY.' });
    }
    const { message, history = [], lang = 'en' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const response = await aiService.chat(req.user.id, message, history, lang);
    res.json({ response });
  } catch (err) {
    console.error('AI chat error:', err.message, err.status || '');
    res.status(500).json({ error: 'AI service unavailable: ' + (err.message || 'unknown error') });
  }
});

// Receipt Scanner — parse receipt image with Claude Vision
router.post('/scan-receipt', auth, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }
    const { image, media_type, lang = 'en' } = req.body;
    if (!image) return res.status(400).json({ error: 'Image data required' });
    const result = await aiService.parseReceipt(image, media_type || 'image/jpeg', req.user.id, lang);
    res.json(result);
  } catch (err) {
    console.error('Receipt scan error:', err.message);
    res.status(500).json({ error: 'Failed to parse receipt: ' + err.message });
  }
});

// Financial Health Score
router.get('/health-score', auth, async (req, res) => {
  try {
    const result = await aiService.calculateHealthScore(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Health score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Suggest category for description
router.post('/suggest-category', auth, async (req, res) => {
  try {
    const { description, type } = req.body;
    const categoryId = await aiService.suggestCategory(description, type || 'expense', req.user.id);
    res.json({ category_id: categoryId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
