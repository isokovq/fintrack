import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { Plus, X, Trash2, Pencil, CreditCard } from 'lucide-react';

const COLORS = ['#1a56db', '#059669', '#dc2626', '#7c3aed', '#d97706', '#0891b2', '#c026d3', '#475569'];
const ACCOUNT_TYPES = ['bank', 'card', 'cash', 'savings', 'investment'];

export default function AccountsPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
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
    <div className="page-content page-transition">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>{t('acc.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('acc.total')}: <strong style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono' }}>{formatCurrency(totalBalance, user?.currency, locale)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditAcc(null); setShowModal(true); }}>
          <Plus size={15} /> {t('acc.add')}
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
                    onClick={() => window.confirm(t('acc.delete_confirm')) && deleteMutation.mutate(acc.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono', marginBottom: 4, color: parseFloat(acc.balance) >= 0 ? 'var(--text-primary)' : 'var(--red)', letterSpacing: '-0.5px' }}>
                {formatCurrency(acc.balance, acc.currency, locale)}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{acc.name}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span className="badge badge-blue">{acc.type}</span>
                <span>{acc.currency}</span>
              </div>
              {(acc.total_income > 0 || acc.total_expense > 0) && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--green)' }}>+{formatCurrency(acc.total_income, acc.currency, locale)}</span>
                  <span style={{ color: 'var(--red)' }}>-{formatCurrency(acc.total_expense, acc.currency, locale)}</span>
                </div>
              )}
            </div>
          ))}

          {accounts.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <p>{t('acc.no_accounts')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editAcc ? t('acc.edit_title') : t('acc.add_title')}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, balance: parseFloat(form.balance) || 0 }); }}>
              <div className="form-group">
                <label className="form-label">{t('acc.name')}</label>
                <input className="form-control" placeholder={t('acc.name_placeholder')} value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('acc.type')}</label>
                  <select className="form-control" value={form.type} onChange={set('type')}>
                    <option value="bank">{t('acc.type_bank')}</option>
                    <option value="card">{t('acc.type_card')}</option>
                    <option value="cash">{t('acc.type_cash')}</option>
                    <option value="savings">{t('acc.type_savings')}</option>
                    <option value="investment">{t('acc.type_investment')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('acc.currency')}</label>
                  <select className="form-control" value={form.currency} onChange={set('currency')}>
                    <option value="USD">{t('auth.currency_usd')}</option>
                    <option value="EUR">{t('auth.currency_eur')}</option>
                    <option value="GBP">{t('auth.currency_gbp')}</option>
                    <option value="UZS">{t('auth.currency_uzs')}</option>
                    <option value="RUB">{t('auth.currency_rub')}</option>
                    <option value="JPY">{t('auth.currency_jpy')}</option>
                  </select>
                </div>
              </div>
              {!editAcc && (
                <div className="form-group">
                  <label className="form-label">{t('acc.balance')}</label>
                  <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={set('balance')} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{t('acc.color')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c, border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {mutation.isPending ? 'Saving...' : editAcc ? t('common.save') : t('acc.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
