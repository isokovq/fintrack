const router = require('express').Router();
const auth = require('../middleware/auth');
const aiService = require('../services/ai');

// Get AI spending insights
router.get('/insights', auth, async (req, res) => {
  try {
    const insights = await aiService.analyzeSpending(req.user.id);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const response = await aiService.chat(req.user.id, message, history);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: 'AI service unavailable' });
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
