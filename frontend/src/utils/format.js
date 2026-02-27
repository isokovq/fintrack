export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  let formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'UZS' ? 0 : 2,
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
  }).format(amount || 0);

  // Fix: Intl formats UZS as "som" but correct Uzbek name is "sum" (soʻm)
  formatted = formatted.replace(/som/gi, 'sum');
  formatted = formatted.replace(/сўм/gi, 'сум');
  formatted = formatted.replace(/soʻm/gi, "so'm");

  return formatted;
}

export function formatDate(date, locale = 'en-US') {
  return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date, locale = 'en-US') {
  return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function getMonthName(month, locale = 'en-US') {
  return new Date(2024, month - 1).toLocaleString(locale, { month: 'long' });
}

export function daysUntil(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const ACCOUNT_ICONS = {
  wallet: '💳', bank: '🏦', card: '💳', cash: '💵', savings: '🏧', investment: '📈'
};

export const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'
];
