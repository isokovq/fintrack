// Uzbek month names fallback (uz-UZ locale not supported in most JS engines)
const UZ_MONTHS_LONG = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];
const UZ_MONTHS_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
  'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'
];
const UZ_WEEKDAYS = [
  'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'
];

/**
 * Format a date with proper Uzbek support.
 * options: subset of Intl.DateTimeFormat options (weekday, month, day, year)
 */
export function formatLocalDate(date, locale = 'en-US', options = {}) {
  const d = new Date(date);
  if (locale === 'uz-UZ') {
    const parts = [];
    if (options.weekday === 'long') parts.push(UZ_WEEKDAYS[d.getDay()]);
    if (options.month === 'long') parts.push(UZ_MONTHS_LONG[d.getMonth()]);
    if (options.month === 'short') parts.push(UZ_MONTHS_SHORT[d.getMonth()]);
    if (options.day === 'numeric') parts.push(d.getDate());
    if (options.year === 'numeric') parts.push(d.getFullYear());
    return parts.join(' ');
  }
  return d.toLocaleDateString(locale, options);
}

export function getUzMonthLong(monthIndex) {
  return UZ_MONTHS_LONG[monthIndex];
}

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
  return formatLocalDate(date, locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date, locale = 'en-US') {
  return formatLocalDate(date, locale, { month: 'short', day: 'numeric' });
}

export function getMonthName(month, locale = 'en-US') {
  if (locale === 'uz-UZ') return UZ_MONTHS_LONG[month - 1];
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
