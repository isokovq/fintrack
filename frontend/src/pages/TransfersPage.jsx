import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, X, ArrowRight } from 'lucide-react';

export default function TransfersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', amount: '', exchange_rate: '1', description: '', date: new Date().toISOString().split('T')[0] });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });
  const { data: transfers = [] } = useQuery({ queryKey: ['transfers'], queryFn: () => api.get('/transfers').then(r => r.data) });

  const fromAcc = accounts.find(a => a.id === form.from_account_id);
  const toAcc = accounts.find(a => a.id === form.to_account_id);
  const differentCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

  const mutation = useMutation({
    mutationFn: (data) => api.post('/transfers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setShowModal(false);
      setForm({ from_account_id: '', to_account_id: '', amount: '', exchange_rate: '1', description: '', date: new Date().toISOString().split('T')[0] });
    }
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Transfers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Move money between accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Transfer
        </button>
      </div>

      <div className="card">
        {transfers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <p>No transfers yet</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th></th>
                <th>To</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className="badge badge-red">{t.from_account_name}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.from_currency}</div>
                  </td>
                  <td><ArrowRight size={16} color="var(--text-muted)" /></td>
                  <td>
                    <span className="badge badge-green">{t.to_account_name}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.to_currency}</div>
                  </td>
                  <td style={{ fontFamily: 'DM Mono', fontWeight: 600 }}>
                    {formatCurrency(t.amount, t.from_currency)}
                    {t.exchange_rate !== 1 && t.exchange_rate !== '1' && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rate: {t.exchange_rate}</div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(t.date)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Transfer</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, amount: parseFloat(form.amount), exchange_rate: parseFloat(form.exchange_rate) }); }}>
              <div className="form-group">
                <label className="form-label">From Account</label>
                <select className="form-control" value={form.from_account_id} onChange={set('from_account_id')} required>
                  <option value="">Select source account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Account</label>
                <select className="form-control" value={form.to_account_id} onChange={set('to_account_id')} required>
                  <option value="">Select destination account</option>
                  {accounts.filter(a => a.id !== form.from_account_id).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
                </div>
                {differentCurrency && (
                  <div className="form-group">
                    <label className="form-label">Exchange Rate</label>
                    <input className="form-control" type="number" step="0.000001" placeholder="1.0" value={form.exchange_rate} onChange={set('exchange_rate')} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      1 {fromAcc.currency} = {form.exchange_rate} {toAcc.currency}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={form.date} onChange={set('date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-control" placeholder="What's this for?" value={form.description} onChange={set('description')} />
                </div>
              </div>
              {differentCurrency && form.amount && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  You'll receive {formatCurrency(parseFloat(form.amount) * parseFloat(form.exchange_rate || 1), toAcc.currency)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {mutation.isPending ? 'Processing...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
