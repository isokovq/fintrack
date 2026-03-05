import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatLocalDate } from '../utils/format';
import { translateCategory } from '../translations';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import MonthNavigator from '../components/ui/MonthNavigator';

function getHeatColor(intensity, isDark) {
  // intensity 0-1, returns a color from cool to hot
  if (intensity === 0) return 'transparent';
  if (intensity < 0.2) return isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.08)';
  if (intensity < 0.4) return isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.1)';
  if (intensity < 0.6) return isDark ? 'rgba(251, 146, 60, 0.25)' : 'rgba(249, 115, 22, 0.15)';
  if (intensity < 0.8) return isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(220, 38, 38, 0.15)';
  return isDark ? 'rgba(248, 113, 113, 0.45)' : 'rgba(220, 38, 38, 0.25)';
}

function getHeatBorder(intensity) {
  if (intensity === 0) return 'transparent';
  if (intensity < 0.3) return 'rgba(5, 150, 105, 0.3)';
  if (intensity < 0.6) return 'rgba(249, 115, 22, 0.3)';
  return 'rgba(220, 38, 38, 0.4)';
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { t, locale, lang } = useLanguage();
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const { data: calData = [] } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => api.get(`/transactions/calendar/${year}/${month}`).then(r => r.data)
  });

  const { data: dayTxData } = useQuery({
    queryKey: ['transactions', 'day', selectedDay],
    queryFn: () => api.get(`/transactions?start_date=${selectedDay}&end_date=${selectedDay}&limit=50`).then(r => r.data),
    enabled: !!selectedDay
  });

  const calMap = {};
  calData.forEach(d => { calMap[d.date] = d; });

  // Compute max expense for heatmap normalization
  const maxExpense = useMemo(() => {
    const vals = calData.map(d => parseFloat(d.expense || 0)).filter(v => v > 0);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [calData]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const dayNames = [t('cal.sun'), t('cal.mon'), t('cal.tue'), t('cal.wed'), t('cal.thu'), t('cal.fri'), t('cal.sat')];

  const handleMonthChange = (m, y) => {
    setDate(new Date(y, m - 1));
    setSelectedDay(null);
  };

  const monthIncome = calData.reduce((s, d) => s + parseFloat(d.income || 0), 0);
  const monthExpense = calData.reduce((s, d) => s + parseFloat(d.expense || 0), 0);

  // Spending streak: consecutive days with expenses
  const spendingDays = calData.filter(d => parseFloat(d.expense || 0) > 0).length;

  return (
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('cal.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('cal.subtitle')}</p>
        </div>
      </div>

      {/* Month summary stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">{t('dash.monthly_income') || 'Income'}</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>+{formatCurrency(monthIncome, user?.currency, locale)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dash.monthly_expenses') || 'Expenses'}</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 18 }}>-{formatCurrency(monthExpense, user?.currency, locale)}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="stat-label">{t('cal.active_days') || 'Active Days'}</div>
          </div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={16} /> {spendingDays} / {daysInMonth}
          </div>
        </div>
      </div>

      {/* Month Navigator */}
      <MonthNavigator month={month} year={year} onChange={handleMonthChange} />

      <div className="card" style={{ marginBottom: 20 }}>

        {/* Day names */}
        <div className="calendar-grid" style={{ marginBottom: 8 }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar days with heatmap */}
        <div className="calendar-grid">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const data = calMap[dateStr];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDay;
            const expense = parseFloat(data?.expense || 0);
            const intensity = maxExpense > 0 ? expense / maxExpense : 0;

            return (
              <div
                key={day}
                className={`calendar-day ${data ? 'has-data' : ''} ${isToday ? 'today' : ''}`}
                style={{
                  background: isSelected ? 'var(--accent-glow)' : getHeatColor(intensity, isDark),
                  borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : intensity > 0 ? getHeatBorder(intensity) : data ? 'var(--border)' : 'transparent',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
              >
                <div className="day-num" style={{ color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}>{day}</div>
                {data && (
                  <>
                    {parseFloat(data.income) > 0 && <div className="day-income">+{Math.round(data.income)}</div>}
                    {parseFloat(data.expense) > 0 && <div className="day-expense">-{Math.round(data.expense)}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Heatmap legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('cal.less') || 'Less'}</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: getHeatColor(v, isDark), border: `1px solid ${getHeatBorder(v)}` }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('cal.more') || 'More'}</span>
        </div>
      </div>

      {/* Selected day transactions */}
      {selectedDay && (
        <div className="card fade-in">
          <div className="card-header">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>
              {formatLocalDate(new Date(selectedDay + 'T00:00:00'), locale, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {calMap[selectedDay] && (
              <div style={{ fontSize: 13, display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--green)' }}>+{formatCurrency(calMap[selectedDay].income, user?.currency, locale)}</span>
                <span style={{ color: 'var(--red)' }}>-{formatCurrency(calMap[selectedDay].expense, user?.currency, locale)}</span>
              </div>
            )}
          </div>
          {dayTxData?.transactions?.length > 0 ? dayTxData.transactions.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon" style={{ background: tx.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                {tx.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
              </div>
              <div className="tx-info">
                <div className="tx-desc">{tx.description || translateCategory(tx.category_name, lang) || 'Transaction'}</div>
                <div className="tx-meta">{translateCategory(tx.category_name, lang)} · {tx.account_name}</div>
              </div>
              <div className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency, locale)}
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>{t('cal.no_tx')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
