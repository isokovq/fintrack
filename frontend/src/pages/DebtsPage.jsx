import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatDate, daysUntil } from '../utils/format';
import { Plus, X, Check, Trash2 } from 'lucide-react';

export default function DebtsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ contact_name: '', amount: '', description: '', due_date: '', direction: 'lent' });

  const { data: debts = [] } = useQuery({ queryKey: ['debts', filter], queryFn: () => api.get(`/debts${filter ? `?status=${filter}` : ''}`).then(r => r.data) });

  const addMutation = useMutation({
    mutationFn: (d) => api.post('/debts', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); setShowModal(false); setForm({ contact_name: '', amount: '', description: '', due_date: '', direction: 'lent' }); }
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/debts/${id}/pay`, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); setPayModal(null); setPayAmount(''); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/debts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] })
  });

  const lent = debts.filter(d => d.direction === 'lent');
  const borrowed = debts.filter(d => d.direction === 'borrowed');
  const totalLent = lent.filter(d => d.status === 'OPEN').reduce((s, d) => s + parseFloat(d.remaining_amount), 0);
  const totalBorrowed = borrowed.filter(d => d.status === 'OPEN').reduce((s, d) => s + parseFloat(d.remaining_amount), 0);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Debts & Loans</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Track money you lent or borrowed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Debt</button>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderColor: 'rgba(34,211,160,0.3)' }}>
          <div className="stat-label">People Owe You</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{formatCurrency(totalLent, user?.currency)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{lent.filter(d => d.status === 'OPEN').length} open debts</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(255,90,126,0.3)' }}>
          <div className="stat-label">You Owe Others</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{formatCurrency(totalBorrowed, user?.currency)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{borrowed.filter(d => d.status === 'OPEN').length} open debts</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16, width: 'fit-content' }}>
        {[['', 'All'], ['OPEN', 'Open'], ['CLOSED', 'Closed']].map(([v, l]) => (
          <button key={v} className={`tab-btn ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {['lent', 'borrowed'].map(dir => {
        const list = debts.filter(d => d.direction === dir);
        if (list.length === 0) return null;
        return (
          <div key={dir} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: dir === 'lent' ? 'var(--green)' : 'var(--red)' }}>
              {dir === 'lent' ? '📤 Money You Lent' : '📥 Money You Borrowed'}
            </h3>
            {list.map(d => {
              const days = d.due_date ? daysUntil(d.due_date) : null;
              const pct = 100 - ((parseFloat(d.remaining_amount) / parseFloat(d.amount)) * 100);
              return (
                <div key={d.id} className="debt-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: dir === 'lent' ? 'rgba(34,211,160,0.15)' : 'rgba(255,90,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                        {d.contact_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.contact_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.description || 'No description'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 15, color: dir === 'lent' ? 'var(--green)' : 'var(--red)' }}>
                        {formatCurrency(d.remaining_amount, user?.currency)}
                      </div>
                      <span className={`badge ${d.status === 'CLOSED' ? 'badge-green' : 'badge-yellow'}`}>{d.status}</span>
                    </div>
                  </div>

                  {d.status === 'OPEN' && (
                    <div className="progress-bar" style={{ marginBottom: 8 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: dir === 'lent' ? 'var(--green)' : 'var(--accent)' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {d.due_date && (
                        <span style={{ color: days !== null && days < 0 ? 'var(--red)' : days !== null && days < 7 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                          {days !== null && days < 0 ? `⚠️ ${Math.abs(days)}d overdue` : days !== null ? `Due in ${days}d` : ''} ({formatDate(d.due_date)})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {d.status === 'OPEN' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setPayModal(d); setPayAmount(d.remaining_amount); }}>
                          <Check size={12} /> Mark Paid
                        </button>
                      )}
                      <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => window.confirm('Delete this debt?') && deleteMutation.mutate(d.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {debts.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <p>No debts recorded yet</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Add First Debt</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add Debt / Loan</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addMutation.mutate({ ...form, amount: parseFloat(form.amount) }); }}>
              <div className="form-group">
                <label className="form-label">Direction</label>
                <div className="tabs">
                  <button type="button" className={`tab-btn ${form.direction === 'lent' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setForm(f => ({ ...f, direction: 'lent' }))}>📤 I Lent</button>
                  <button type="button" className={`tab-btn ${form.direction === 'borrowed' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setForm(f => ({ ...f, direction: 'borrowed' }))}>📥 I Borrowed</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{form.direction === 'lent' ? 'Borrower Name' : 'Lender Name'}</label>
                <input className="form-control" placeholder="Contact name" value={form.contact_name} onChange={set('contact_name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-control" type="date" value={form.due_date} onChange={set('due_date')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" placeholder="What for?" value={form.description} onChange={set('description')} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Add Debt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="btn-icon" onClick={() => setPayModal(null)}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
              Remaining: <strong style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono' }}>{formatCurrency(payModal.remaining_amount, user?.currency)}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Amount</label>
              <input className="form-control" type="number" step="0.01" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPayModal(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button className="btn btn-success" onClick={() => payMutation.mutate({ id: payModal.id, amount: parseFloat(payAmount) })} style={{ flex: 2, justifyContent: 'center' }}>
                <Check size={14} /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
