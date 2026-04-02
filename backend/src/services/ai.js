const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('⚠️  ANTHROPIC_API_KEY is not set! AI features will not work.');
}
const client = new Anthropic({ apiKey: apiKey || 'missing' });

const MODEL = 'claude-sonnet-4-20250514';

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
      model: MODEL,
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
      model: MODEL,
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
      model: MODEL,
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

// Parse receipt image using Claude Vision
async function parseReceipt(base64Image, mediaType, userId, lang = 'en') {
  try {
    const userRow = await db.query('SELECT currency FROM users WHERE id=$1', [userId]);
    const currency = userRow.rows[0]?.currency || 'USD';
    const langName = LANG_NAMES[lang] || 'English';

    const categories = await db.query(
      `SELECT id, name FROM categories WHERE (user_id=$1 OR is_default=true) AND type='expense'`,
      [userId]
    );
    const catList = categories.rows.map(c => `${c.name} (id: ${c.id})`).join(', ');

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image }
          },
          {
            type: 'text',
            text: `You are a receipt parser for a personal finance app. Analyze this receipt image and extract transaction data.

The user's currency is ${currency}.

Available expense categories: ${catList}

Return a JSON object with:
{
  "items": [
    {
      "description": "item or store name",
      "amount": number (in ${currency}),
      "category_id": "UUID of best matching category",
      "date": "YYYY-MM-DD" (from receipt, or today if not visible)
    }
  ],
  "store_name": "name of store/merchant",
  "total": number (total amount on receipt in ${currency}),
  "date": "YYYY-MM-DD",
  "summary": "brief description in ${langName}"
}

If you can identify individual line items, list them. If only a total is visible, return one item with the total.
Return ONLY valid JSON, no markdown.`
          }
        ]
      }]
    });

    const text = response.content[0].text.trim();
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Receipt parsing failed:', err.message);
    throw err;
  }
}

// Financial health score calculation
async function calculateHealthScore(userId) {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Get current month income/expense
    const statsResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id=$1 AND date >= $2
    `, [userId, monthStart]);

    const income = parseFloat(statsResult.rows[0].income);
    const expense = parseFloat(statsResult.rows[0].expense);

    // Get total balance
    const balResult = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id=$1',
      [userId]
    );
    const totalBalance = parseFloat(balResult.rows[0].total);

    // Get budget adherence
    const budgetResult = await db.query(`
      SELECT COUNT(*) as total_budgets,
        SUM(CASE WHEN spent <= amount THEN 1 ELSE 0 END) as within_budget
      FROM (
        SELECT b.amount,
          COALESCE((SELECT SUM(t.amount) FROM transactions t
            WHERE t.user_id=$1 AND t.category_id=b.category_id AND t.type='expense'
            AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)), 0) as spent
        FROM budgets b WHERE b.user_id=$1
      ) sub
    `, [userId]);

    const totalBudgets = parseInt(budgetResult.rows[0].total_budgets || 0);
    const withinBudget = parseInt(budgetResult.rows[0].within_budget || 0);

    // Get debt situation
    const debtResult = await db.query(
      `SELECT COALESCE(SUM(remaining_amount), 0) as total_debt FROM debts WHERE user_id=$1 AND status='OPEN'`,
      [userId]
    );
    const totalDebt = parseFloat(debtResult.rows[0].total_debt);

    // Get goals progress
    const goalsResult = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN current_amount >= target_amount THEN 1 ELSE 0 END) as achieved
       FROM savings_goals WHERE user_id=$1`,
      [userId]
    );
    const totalGoals = parseInt(goalsResult.rows[0].total || 0);
    const achievedGoals = parseInt(goalsResult.rows[0].achieved || 0);

    // Calculate score components (0-100)
    let score = 50; // Base score
    const breakdown = {};

    // 1. Savings Rate (0-30 points)
    const savingsRate = income > 0 ? ((income - expense) / income) : 0;
    const savingsPoints = Math.min(Math.max(savingsRate * 100, 0), 30);
    score += savingsPoints - 15; // -15 to 15 range
    breakdown.savings_rate = { value: Math.round(savingsRate * 100), points: Math.round(savingsPoints) };

    // 2. Budget Adherence (0-20 points)
    const budgetScore = totalBudgets > 0 ? (withinBudget / totalBudgets) * 20 : 10;
    score += budgetScore - 10;
    breakdown.budget_adherence = { value: totalBudgets > 0 ? Math.round((withinBudget / totalBudgets) * 100) : null, points: Math.round(budgetScore) };

    // 3. Balance Health (0-20 points)
    const monthlyExpense = expense || 1;
    const emergencyMonths = totalBalance / monthlyExpense;
    const balancePoints = Math.min(emergencyMonths * 3.3, 20);
    score += balancePoints - 10;
    breakdown.emergency_fund = { value: Math.round(emergencyMonths * 10) / 10, points: Math.round(balancePoints) };

    // 4. Debt-to-Income (0-15 points)
    const dtiRatio = income > 0 ? totalDebt / (income * 12) : 0;
    const debtPoints = Math.max(15 - dtiRatio * 30, 0);
    score += debtPoints - 7.5;
    breakdown.debt_ratio = { value: Math.round(dtiRatio * 100), points: Math.round(debtPoints) };

    // 5. Goals Progress (0-15 points)
    const goalProgress = totalGoals > 0 ? (achievedGoals / totalGoals) * 15 : 7.5;
    score += goalProgress - 7.5;
    breakdown.goals = { value: totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : null, points: Math.round(goalProgress) };

    // Clamp score
    score = Math.min(Math.max(Math.round(score), 0), 100);

    // Grade
    let grade, color;
    if (score >= 80) { grade = 'Excellent'; color = '#10b981'; }
    else if (score >= 60) { grade = 'Good'; color = '#3b82f6'; }
    else if (score >= 40) { grade = 'Fair'; color = '#f59e0b'; }
    else { grade = 'Needs Work'; color = '#ef4444'; }

    return { score, grade, color, breakdown };
  } catch (err) {
    console.error('Health score calculation failed:', err.message);
    return { score: 50, grade: 'Unknown', color: '#94a3b8', breakdown: {} };
  }
}

module.exports = { suggestCategory, analyzeSpending, chat, parseReceipt, calculateHealthScore };
