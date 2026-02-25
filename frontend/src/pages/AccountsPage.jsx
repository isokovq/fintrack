import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { Plus, X, Trash2, Pencil, CreditCard } from 'lucide-react';

const COLORS = ['#1a56db', '#059669', '#dc2626', '#7c3aed', '#d97706', '#0891b2', '#c026d3', '#475569'];
const ACCOUNT_TYPES = ['bank', 'card', 'cash', 'savings', 'investment'];
const ACCOUNT_LABELS = { bank: 'Bank', card: 'Card', cash: 'Cash', savings: 'Savings', investment: 'Investment' };

export default function AccountsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'bank', currency: 'USD', balance: '', color: '#1a56db' });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: (data) => editAcc ? api.put(`/accounts/${editAcc.id}`, data) : api.post('/accounts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); closeModal(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] })
  });

  const openEdit = (acc) => {
    setEditAcc(acc);
    setForm({ name: acc.name, type: acc.type, currency: acc.currency, balance: acc.balance, color: acc.color });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditAcc(null); setForm({ name: '', type: 'bank', currency: 'USD', balance: '', color: '#1a56db' }); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>Accounts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Total: <strong style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono' }}>{formatCurrency(totalBalance, user?.currency)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditAcc(null); setShowModal(true); }}>
          <Plus size={15} /> Add Account
        </button>
      </div>

      {isLoading ? <div className="empty-state">Loading...</div> : (
        <div className="grid-3">
          {accounts.map(acc => (
            <div key={acc.id} className="account-card">
              <div className="account-pattern" style={{ background: acc.color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: `${acc.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} color={acc.color} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => openEdit(acc)}><Pencil size={12} /></button>
                  <button className="btn-icon" style={{ color: 'var(--red)' }}
                    onClick={() => window.confirm('Delete account?') && deleteMutation.mutate(acc.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono', marginBottom: 4, color: parseFloat(acc.balance) >= 0 ? 'var(--text-primary)' : 'var(--red)', letterSpacing: '-0.5px' }}>
                {formatCurrency(acc.balance, acc.currency)}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{acc.name}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span className="badge badge-blue">{acc.type}</span>
                <span>{acc.currency}</span>
              </div>
              {(acc.total_income > 0 || acc.total_expense > 0) && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--green)' }}>+{formatCurrency(acc.total_income, acc.currency)}</span>
                  <span style={{ color: 'var(--red)' }}>-{formatCurrency(acc.total_expense, acc.currency)}</span>
                </div>
              )}
            </div>
          ))}

          {accounts.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <p>No accounts yet. Add your first account!</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editAcc ? 'Edit Account' : 'Add Account'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, balance: parseFloat(form.balance) || 0 }); }}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input className="form-control" placeholder="My Bank Account" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={set('type')}>
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-control" value={form.currency} onChange={set('currency')}>
                    {['USD', 'EUR', 'GBP', 'UZS', 'RUB', 'JPY', 'CNY'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {!editAcc && (
                <div className="form-group">
                  <label className="form-label">Initial Balance</label>
                  <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={set('balance')} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c, border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {mutation.isPending ? 'Saving...' : editAcc ? 'Save Changes' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
