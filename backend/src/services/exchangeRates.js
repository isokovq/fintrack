/**
 * Exchange Rate Service
 * Fetches daily rates from Central Bank of Uzbekistan (cbu.uz)
 * Caches rates for 1 hour to avoid excessive API calls
 */

let cachedRates = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fallback rates in case CBU API is down
const FALLBACK_RATES = {
  USD: 12850,
  EUR: 14000,
  RUB: 140,
  GBP: 16200,
  JPY: 85,
  CHF: 14500,
  CNY: 1770,
  KZT: 25.5,
  TRY: 390,
  KRW: 9.3,
};

/**
 * Fetch rates from Central Bank of Uzbekistan
 * API returns array of objects: { Ccy: "USD", Rate: "12850.00", Nominal: "1", ... }
 * All rates are per 1 unit of foreign currency = X UZS
 */
async function fetchCBURates() {
  try {
    const response = await fetch('https://cbu.uz/en/arkhiv-kursov-valyut/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`CBU API returned ${response.status}`);

    const data = await response.json();
    const rates = {};

    for (const item of data) {
      const code = item.Ccy;
      const nominal = parseFloat(item.Nominal) || 1;
      const rate = parseFloat(item.Rate) || 0;
      // Rate is per Nominal units, so rate per 1 unit = Rate / Nominal
      rates[code] = rate / nominal;
    }

    // UZS to itself
    rates['UZS'] = 1;

    console.log(`CBU rates fetched: 1 USD = ${rates['USD']} UZS`);
    return rates;
  } catch (err) {
    console.error('Failed to fetch CBU rates:', err.message);
    return null;
  }
}

/**
 * Get current exchange rates (all currencies -> UZS)
 * Returns object like { USD: 12850, EUR: 14000, RUB: 140, UZS: 1, ... }
 */
async function getRates() {
  const now = Date.now();
  if (cachedRates && (now - cacheTime) < CACHE_TTL) {
    return cachedRates;
  }

  const freshRates = await fetchCBURates();
  if (freshRates) {
    cachedRates = freshRates;
    cacheTime = now;
    return cachedRates;
  }

  // If we have stale cache, use it
  if (cachedRates) {
    console.warn('Using stale CBU rate cache');
    return cachedRates;
  }

  // Last resort: fallback
  console.warn('Using fallback exchange rates');
  return { ...FALLBACK_RATES, UZS: 1 };
}

/**
 * Convert amount from one currency to another
 * All conversions go through UZS as the base
 */
async function convert(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rates = await getRates();
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  // from -> UZS -> to
  return (amount * fromRate) / toRate;
}

/**
 * Convert amount to UZS
 */
async function toUZS(amount, fromCurrency) {
  if (fromCurrency === 'UZS') return amount;
  const rates = await getRates();
  return amount * (rates[fromCurrency] || 1);
}

module.exports = { getRates, convert, toUZS };
