import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';

const POPULAR_RATES = {
  'USD-UZS': 12750, 'UZS-USD': 1 / 12750,
  'EUR-UZS': 13900, 'UZS-EUR': 1 / 13900,
  'RUB-UZS': 138, 'UZS-RUB': 1 / 138,
  'USD-EUR': 0.92, 'EUR-USD': 1.09,
  'USD-RUB': 92.5, 'RUB-USD': 1 / 92.5,
  'EUR-RUB': 100.8, 'RUB-EUR': 1 / 100.8,
};

const CURRENCIES = ['USD', 'EUR', 'UZS', 'RUB', 'GBP', 'TRY', 'KZT', 'CNY'];

export default function CurrencyConverter() {
  const { t } = useLanguage();
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('UZS');
  const [amount, setAmount] = useState('1');
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = `${from}-${to}`;
    if (POPULAR_RATES[key]) {
      setRate(POPULAR_RATES[key]);
    } else if (from === to) {
      setRate(1);
    } else {
      // Fallback: try to compute through USD
      const toUSD = POPULAR_RATES[`${from}-USD`] || (POPULAR_RATES[`USD-${from}`] ? 1 / POPULAR_RATES[`USD-${from}`] : null);
      const fromUSD = POPULAR_RATES[`USD-${to}`] || (POPULAR_RATES[`${to}-USD`] ? 1 / POPULAR_RATES[`${to}-USD`] : null);
      if (toUSD && fromUSD) {
        setRate(toUSD * fromUSD);
      } else {
        setRate(null);
      }
    }
  }, [from, to]);

  const swap = () => { setFrom(to); setTo(from); };
  const result = rate && amount ? (parseFloat(amount) * rate) : null;

  const formatNum = (n) => {
    if (n === null) return '—';
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  };

  return (
    <div className="converter-widget">
      <div className="converter-header">
        <RefreshCw size={14} color="var(--accent)" />
        <span>{t('transfers.converter') || 'Currency Converter'}</span>
      </div>
      <div className="converter-body">
        <div className="converter-row">
          <input
            className="form-control converter-input"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="any"
          />
          <select className="form-control converter-select" value={from} onChange={e => setFrom(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button className="converter-swap" onClick={swap} title="Swap">
          <ArrowLeftRight size={14} />
        </button>

        <div className="converter-row">
          <div className="converter-result">
            {result !== null ? formatNum(result) : '—'}
          </div>
          <select className="form-control converter-select" value={to} onChange={e => setTo(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {rate && (
          <div className="converter-rate">
            1 {from} = {formatNum(rate)} {to}
          </div>
        )}
      </div>
    </div>
  );
}
