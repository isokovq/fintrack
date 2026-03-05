import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'UZS', 'RUB', 'GBP', 'TRY', 'KZT', 'CNY', 'JPY', 'CHF', 'KRW'];

export default function CurrencyConverter() {
  const { t } = useLanguage();
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('UZS');
  const [amount, setAmount] = useState('1');
  const [rate, setRate] = useState(null);

  // Fetch real CBU rates
  const { data: ratesData, isLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => api.get('/exchange-rates').then(r => r.data),
    staleTime: 3600000, // 1 hour cache
    retry: 1
  });

  useEffect(() => {
    const rates = ratesData?.rates;
    if (!rates) { setRate(null); return; }

    if (from === to) {
      setRate(1);
    } else {
      // All rates are X currency -> UZS
      const fromToUZS = from === 'UZS' ? 1 : (rates[from] || null);
      const toToUZS = to === 'UZS' ? 1 : (rates[to] || null);
      if (fromToUZS && toToUZS) {
        setRate(fromToUZS / toToUZS);
      } else {
        setRate(null);
      }
    }
  }, [from, to, ratesData]);

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
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {isLoading ? '...' : ratesData ? 'CBU.uz' : ''}
        </span>
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
