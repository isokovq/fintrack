import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatCurrency, getMonthName } from '../../utils/format';
import { Flame } from 'lucide-react';

export default function SpendingHeatmap({ year }) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['heatmap', year],
    queryFn: () => api.get(`/transactions/stats/heatmap?year=${year}`).then(r => r.data),
    staleTime: 60000
  });

  const { grid, maxExpense, totalDays } = useMemo(() => {
    const days = data?.days || [];
    const dayMap = {};
    let max = 0;
    for (const d of days) {
      const key = d.day.split('T')[0];
      const expense = parseFloat(d.expense || 0);
      dayMap[key] = { expense, income: parseFloat(d.income || 0), count: parseInt(d.count) };
      if (expense > max) max = expense;
    }

    // Build 12 months grid
    const months = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const monthDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        monthDays.push({ date: key, ...(dayMap[key] || { expense: 0, income: 0, count: 0 }) });
      }
      months.push(monthDays);
    }

    return { grid: months, maxExpense: max, totalDays: days.length };
  }, [data, year]);

  const getColor = (expense) => {
    if (expense === 0) return 'var(--bg-elevated)';
    const ratio = maxExpense > 0 ? expense / maxExpense : 0;
    if (ratio < 0.2) return 'rgba(79, 70, 229, 0.15)';
    if (ratio < 0.4) return 'rgba(79, 70, 229, 0.3)';
    if (ratio < 0.6) return 'rgba(79, 70, 229, 0.5)';
    if (ratio < 0.8) return 'rgba(239, 68, 68, 0.4)';
    return 'rgba(239, 68, 68, 0.7)';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={14} color="var(--red)" /> {t('heatmap.title') || 'Spending Heatmap'}
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {totalDays} {t('heatmap.active_days') || 'active days'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowX: 'auto' }}>
        {grid.map((monthDays, mIdx) => (
          <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
              {getMonthName(mIdx + 1, locale).substring(0, 3)}
            </div>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
              {monthDays.map(day => (
                <div key={day.date} title={`${day.date}: ${formatCurrency(day.expense, user?.currency, locale)}`}
                  style={{
                    width: 11, height: 11, borderRadius: 2,
                    background: getColor(day.expense),
                    cursor: day.expense > 0 ? 'pointer' : 'default',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => { if (day.expense > 0) e.target.style.transform = 'scale(1.5)'; }}
                  onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>{t('heatmap.less') || 'Less'}</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(r => (
          <div key={r} style={{
            width: 11, height: 11, borderRadius: 2,
            background: r === 0 ? 'var(--bg-elevated)' :
              r < 0.3 ? 'rgba(79, 70, 229, 0.15)' :
              r < 0.5 ? 'rgba(79, 70, 229, 0.3)' :
              r < 0.7 ? 'rgba(79, 70, 229, 0.5)' :
              r < 0.9 ? 'rgba(239, 68, 68, 0.4)' :
              'rgba(239, 68, 68, 0.7)'
          }} />
        ))}
        <span>{t('heatmap.more') || 'More'}</span>
      </div>
    </div>
  );
}
