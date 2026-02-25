import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

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

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = date.toLocaleString('en', { month: 'long', year: 'numeric' });

  const prev = () => setDate(d => new Date(d.getFullYear(), d.getMonth() - 1));
  const next = () => setDate(d => new Date(d.getFullYear(), d.getMonth() + 1));

  const monthIncome = calData.reduce((s, d) => s + parseFloat(d.income || 0), 0);
  const monthExpense = calData.reduce((s, d) => s + parseFloat(d.expense || 0), 0);

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Calendar View</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Daily transaction overview</p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: 'var(--green)', fontFamily: 'DM Mono', fontWeight: 600 }}>+{formatCurrency(monthIncome, user?.currency)}</span>
          <span style={{ color: 'var(--red)', fontFamily: 'DM Mono', fontWeight: 600 }}>-{formatCurrency(monthExpense, user?.currency)}</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button className="btn-icon" onClick={prev}><ChevronLeft size={16} /></button>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{monthName}</h2>
          <button className="btn-icon" onClick={next}><ChevronRight size={16} /></button>
        </div>

        {/* Day names */}
        <div className="calendar-grid" style={{ marginBottom: 8 }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-grid">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const data = calMap[dateStr];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDay;

            return (
              <div
                key={day}
                className={`calendar-day ${data ? 'has-data' : ''} ${isToday ? 'today' : ''}`}
                style={{ background: isSelected ? 'var(--accent-glow)' : '', borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : data ? 'var(--border)' : 'transparent' }}
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
      </div>

      {/* Selected day transactions */}
      {selectedDay && (
        <div className="card fade-in">
          <div className="card-header">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {calMap[selectedDay] && (
              <div style={{ fontSize: 13, display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--green)' }}>+{formatCurrency(calMap[selectedDay].income, user?.currency)}</span>
                <span style={{ color: 'var(--red)' }}>-{formatCurrency(calMap[selectedDay].expense, user?.currency)}</span>
              </div>
            )}
          </div>
          {dayTxData?.transactions?.length > 0 ? dayTxData.transactions.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon" style={{ background: tx.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                {tx.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
              </div>
              <div className="tx-info">
                <div className="tx-desc">{tx.description || tx.category_name || 'Transaction'}</div>
                <div className="tx-meta">{tx.category_name} • {tx.account_name}</div>
              </div>
              <div className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency)}
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No transactions on this day</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
