import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { Plus, X, Trash2, Target, TrendingUp, Utensils, Car, ShoppingBag, Tv, Heart, Home, BookOpen, Zap, Plane, Tag, BarChart3, ShoppingCart, Dumbbell } from 'lucide-react';

const ICON_MAP = {
  utensils: Utensils, car: Car, 'shopping-bag': ShoppingBag, tv: Tv, heart: Heart,
  home: Home, book: BookOpen, zap: Zap, plane: Plane, 'shopping-cart': ShoppingCart,
  dumbbell: Dumbbell
};

export default function BudgetPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [form, setForm] = useState({ category_id: '', limit_amount: '' });
  const [incomeTarget, setIncomeTarget] = useState('');

  const { data } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => api.get(`/budgets?month=${month}&year=${year}`).then(r => r.data)
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => api.get('/categories?type=expense').then(r => r.data)
  });

  const addBudget = useMutation({
    mutationFn: (d) => api.post('/budgets', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowModal(false); setForm({ category_id: '', limit_amount: '' }); }
  });

  const deleteBudget = useMutation({
    mutationFn: (id) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] })
  });

  const addIncomeBudget = useMutation({
    mutationFn: (d) => api.post('/budgets/income', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowIncomeModal(false); }
  });

  const budgets = data?.budgets || [];
  const incomeBudget = data?.incomeBudget;

  const totalLimit = budgets.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent_amount), 0);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2024, i).toLocaleString('en', { month: 'long' }) }));

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Budget Planning</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Track and manage your spending limits</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowIncomeModal(true)}><Target size={14} /> Income Target</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Budget</button>
        </div>
      </div>

      {/* Month selector */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 160 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="form-control" style={{ width: 100 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Income target card */}
      {incomeBudget && (
        <div className="card" style={{ marginBottom: 20, background: 'var(--green-bg)', borderColor: 'rgba(5,150,105,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Income Target</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono', color: 'var(--green)' }}>
                {formatCurrency(incomeBudget.actual_income, user?.currency)} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/ {formatCurrency(incomeBudget.target_amount, user?.currency)}</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {parseFloat(incomeBudget.actual_income) >= parseFloat(incomeBudget.target_amount) ? <Target size={20} color="var(--green)" /> : <TrendingUp size={20} color="var(--green)" />}
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop: 12 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, (incomeBudget.actual_income / incomeBudget.target_amount) * 100)}%`, background: 'var(--green)' }} />
          </div>
        </div>
      )}

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Budget Limit</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{formatCurrency(totalLimit, user?.currency)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value" style={{ color: totalSpent > totalLimit ? 'var(--red)' : 'var(--green)' }}>
              {formatCurrency(totalSpent, user?.currency)}
              <span style={{ fontSize: 13, fontFamily: 'sans-serif', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                ({totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Budget list */}
      <div className="card">
        {budgets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><BarChart3 size={32} color="var(--text-muted)" /></div>
            <p>No budgets set for this month</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
              <Plus size={14} /> Set Budget Limits
            </button>
          </div>
        ) : budgets.map(b => {
          const pct = Math.min(100, (parseFloat(b.spent_amount) / parseFloat(b.limit_amount)) * 100);
          const over = parseFloat(b.spent_amount) > parseFloat(b.limit_amount);
          const warn = pct >= 80;
          return (
            <div key={b.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${b.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => { const Icon = ICON_MAP[b.icon] || Tag; return <Icon size={16} color={b.color} />; })()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.category_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatCurrency(b.spent_amount, user?.currency)} of {formatCurrency(b.limit_amount, user?.currency)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${over ? 'badge-red' : warn ? 'badge-yellow' : 'badge-green'}`}>
                    {over ? 'Over limit' : `${Math.round(pct)}%`}
                  </span>
                  <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => window.confirm('Remove budget?') && deleteBudget.mutate(b.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${pct}%`,
                  background: over ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)'
                }} />
              </div>
              {over && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                  Over by {formatCurrency(parseFloat(b.spent_amount) - parseFloat(b.limit_amount), user?.currency)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Budget Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Set Budget Limit</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addBudget.mutate({ category_id: form.category_id, month, year, limit_amount: parseFloat(form.limit_amount) }); }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Select category</option>
                  {categories.filter(c => !budgets.find(b => b.category_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Limit</label>
                <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.limit_amount} onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Set Limit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Income Budget Modal */}
      {showIncomeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowIncomeModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Set Income Target</h2>
              <button className="btn-icon" onClick={() => setShowIncomeModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addIncomeBudget.mutate({ month, year, target_amount: parseFloat(incomeTarget) }); }}>
              <div className="form-group">
                <label className="form-label">Monthly Income Target</label>
                <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={incomeTarget} onChange={e => setIncomeTarget(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowIncomeModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ flex: 2, justifyContent: 'center' }}>Set Target</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
