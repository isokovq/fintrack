const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANG_NAMES = { en: 'English', ru: 'Russian', uz: 'Uzbek' };

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

// Analyze spending habits and generate insights (category + description-based)
async function analyzeSpending(userId, lang = 'en') {
  try {
    const userRow = await db.query('SELECT currency FROM users WHERE id=$1', [userId]);
    const currency = userRow.rows[0]?.currency || 'USD';
    const langName = LANG_NAMES[lang] || 'English';

    const categoryStats = await db.query(
      `SELECT c.name as category, SUM(t.amount) as total, COUNT(*) as count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id=$1 AND t.type='expense' AND t.date >= NOW() - INTERVAL '3 months'
       GROUP BY c.name ORDER BY total DESC LIMIT 10`,
      [userId]
    );

    const recentDescriptions = await db.query(
      `SELECT t.description, t.amount, t.date::text, c.name as category
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id=$1 AND t.type='expense' AND t.date >= NOW() - INTERVAL '2 months'
         AND t.description IS NOT NULL AND t.description != ''
       ORDER BY t.date DESC LIMIT 50`,
      [userId]
    );

    const monthComparison = await db.query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM') as month,
         SUM(amount) as total,
         COUNT(*) as tx_count
       FROM transactions
       WHERE user_id=$1 AND type='expense' AND date >= NOW() - INTERVAL '3 months'
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY month`,
      [userId]
    );

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You are a sharp personal finance advisor. Analyze this user's spending data in detail and provide 4-5 actionable insights.

CRITICAL: You MUST respond entirely in ${langName}. All titles and messages must be in ${langName}.

CRITICAL: The user's currency is ${currency}. ALL amounts in the data are in ${currency}. You MUST use ${currency} when referring to any amounts. NEVER use $ or USD unless the user's currency is actually USD. For example, if the currency is UZS, say "50,000 UZS" not "$50,000".

IMPORTANT: Go beyond just category totals. Look at the individual transaction DESCRIPTIONS to find specific patterns, recurring merchants, habits, and potential savings. Be specific — mention actual items/places when you see patterns.

Category totals (last 3 months): ${JSON.stringify(categoryStats.rows)}

Recent transaction details: ${JSON.stringify(recentDescriptions.rows)}

Monthly totals: ${JSON.stringify(monthComparison.rows)}

Return a JSON array of insights, each with: { "type": "warning|tip|info|saving", "title": "short title in ${langName}", "message": "specific actionable insight in ${langName} referencing actual spending patterns using ${currency} for all amounts", "emoji": "single emoji" }
Return ONLY valid JSON, no markdown or explanation.`
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
async function chat(userId, userMessage, history = [], lang = 'en') {
  try {
    const userRow = await db.query('SELECT currency FROM users WHERE id=$1', [userId]);
    const currency = userRow.rows[0]?.currency || 'USD';
    const langName = LANG_NAMES[lang] || 'English';

    const userStats = await db.query(
      `SELECT
        (SELECT SUM(amount) FROM transactions WHERE user_id=$1 AND type='income' AND DATE_TRUNC('month', date)=DATE_TRUNC('month', CURRENT_DATE)) as monthly_income,
        (SELECT SUM(amount) FROM transactions WHERE user_id=$1 AND type='expense' AND DATE_TRUNC('month', date)=DATE_TRUNC('month', CURRENT_DATE)) as monthly_expense,
        (SELECT SUM(balance) FROM accounts WHERE user_id=$1) as total_balance`,
      [userId]
    );

    const systemPrompt = `You are FinTrack AI, a smart and friendly personal finance assistant.
CRITICAL: You MUST respond entirely in ${langName}. Every word of your response must be in ${langName}.
IMPORTANT: The user's currency is ${currency}. ALWAYS use ${currency} when referring to amounts. NEVER use $ or USD unless the currency is actually USD.

Current user financial snapshot:
- Monthly income: ${userStats.rows[0].monthly_income || 0} ${currency}
- Monthly expenses: ${userStats.rows[0].monthly_expense || 0} ${currency}
- Total balance: ${userStats.rows[0].total_balance || 0} ${currency}

Give concise, actionable financial advice in ${langName}. Keep responses under 200 words. Always use ${currency} for all monetary amounts.`;

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
