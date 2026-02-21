const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Suggest expense category based on description
async function suggestCategory(description, type, userId) {
  try {
    const categories = await db.query(
      `SELECT id, name FROM categories WHERE (user_id=$1 OR is_default=true) AND (type=$2 OR type='both')`,
      [userId, type]
    );
    const catList = categories.rows.map(c => `${c.name} (id: ${c.id})`).join(', ');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Given this transaction description: "${description}"
Available categories: ${catList}
Return ONLY the UUID of the most appropriate category. Nothing else, just the UUID.`
      }]
    });

    const suggestedId = message.content[0].text.trim();
    const valid = categories.rows.find(c => c.id === suggestedId);
    return valid ? suggestedId : null;
  } catch (err) {
    console.error('AI category suggestion failed:', err.message);
    return null;
  }
}

// Analyze spending habits and generate insights
async function analyzeSpending(userId) {
  try {
    const stats = await db.query(
      `SELECT c.name as category, SUM(t.amount) as total, COUNT(*) as count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id=$1 AND t.type='expense' AND t.date >= NOW() - INTERVAL '3 months'
       GROUP BY c.name ORDER BY total DESC LIMIT 10`,
      [userId]
    );

    const prevMonthStats = await db.query(
      `SELECT c.name as category, SUM(t.amount) as total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id=$1 AND t.type='expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
       GROUP BY c.name`,
      [userId]
    );

    const currentMonthStats = await db.query(
      `SELECT c.name as category, SUM(t.amount) as total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id=$1 AND t.type='expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY c.name`,
      [userId]
    );

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a personal finance advisor. Analyze this spending data and provide 3-4 actionable insights.

Top spending categories (last 3 months): ${JSON.stringify(stats.rows)}
Last month's spending: ${JSON.stringify(prevMonthStats.rows)}
This month's spending: ${JSON.stringify(currentMonthStats.rows)}

Return a JSON array of insights, each with: { "type": "warning|tip|info", "title": "...", "message": "...", "emoji": "..." }
Return ONLY valid JSON, no markdown.`
      }]
    });

    const text = message.content[0].text.trim();
    try {
      const insights = JSON.parse(text);
      return Array.isArray(insights) ? insights : [];
    } catch (parseErr) {
      console.error('AI insights JSON parse failed:', parseErr.message);
      return [];
    }
  } catch (err) {
    console.error('AI analysis failed:', err.message);
    return [];
  }
}

// AI chat for financial advice
async function chat(userId, userMessage, history = []) {
  try {
    const userStats = await db.query(
      `SELECT 
        (SELECT SUM(amount) FROM transactions WHERE user_id=$1 AND type='income' AND DATE_TRUNC('month', date)=DATE_TRUNC('month', CURRENT_DATE)) as monthly_income,
        (SELECT SUM(amount) FROM transactions WHERE user_id=$1 AND type='expense' AND DATE_TRUNC('month', date)=DATE_TRUNC('month', CURRENT_DATE)) as monthly_expense,
        (SELECT SUM(balance) FROM accounts WHERE user_id=$1) as total_balance`,
      [userId]
    );

    const systemPrompt = `You are FinTrack AI, a smart and friendly personal finance assistant.
Current user financial snapshot:
- Monthly income: $${userStats.rows[0].monthly_income || 0}
- Monthly expenses: $${userStats.rows[0].monthly_expense || 0}
- Total balance: $${userStats.rows[0].total_balance || 0}

Give concise, actionable financial advice. Keep responses under 200 words.`;

    const messages = [...history, { role: 'user', content: userMessage }];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages
    });

    return response.content[0].text;
  } catch (err) {
    console.error('AI chat failed:', err.message);
    throw err;
  }
}

module.exports = { suggestCategory, analyzeSpending, chat };
