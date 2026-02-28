import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, X, ArrowRight, ArrowLeftRight } from 'lucide-react';
import CurrencyConverter from '../components/ui/CurrencyConverter';

export default function TransfersPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
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
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('transfers.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('transfers.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> {t('transfers.add')}
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
        <div className="card">
          {transfers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ArrowLeftRight size={32} color="var(--text-muted)" /></div>
              <p>{t('transfers.no_transfers')}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('transfers.from')}</th>
                  <th></th>
                  <th>{t('transfers.to')}</th>
                  <th>{t('transfers.amount')}</th>
                  <th>{t('transfers.date')}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(tr => (
                  <tr key={tr.id}>
                    <td>
                      <span className="badge badge-red">{tr.from_account_name}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tr.from_currency}</div>
                    </td>
                    <td><ArrowRight size={16} color="var(--text-muted)" /></td>
                    <td>
                      <span className="badge badge-green">{tr.to_account_name}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tr.to_currency}</div>
                    </td>
                    <td style={{ fontFamily: 'DM Mono', fontWeight: 600 }}>
                      {formatCurrency(tr.amount, tr.from_currency, locale)}
                      {tr.exchange_rate !== 1 && tr.exchange_rate !== '1' && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('transfers.exchange_rate')}: {tr.exchange_rate}</div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(tr.date, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Currency Converter Widget */}
        <CurrencyConverter />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{t('transfers.add_title')}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, amount: parseFloat(form.amount), exchange_rate: parseFloat(form.exchange_rate) }); }}>
              <div className="form-group">
                <label className="form-label">{t('transfers.from_account')}</label>
                <select className="form-control" value={form.from_account_id} onChange={set('from_account_id')} required>
                  <option value="">{t('transfers.select_source')}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency, locale)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('transfers.to_account')}</label>
                <select className="form-control" value={form.to_account_id} onChange={set('to_account_id')} required>
                  <option value="">{t('transfers.select_dest')}</option>
                  {accounts.filter(a => a.id !== form.from_account_id).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency, locale)})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('transfers.amount')}</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
                </div>
                {differentCurrency && (
                  <div className="form-group">
                    <label className="form-label">{t('transfers.exchange_rate')}</label>
                    <input className="form-control" type="number" step="0.000001" placeholder="1.0" value={form.exchange_rate} onChange={set('exchange_rate')} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      1 {fromAcc.currency} = {form.exchange_rate} {toAcc.currency}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('transfers.date')}</label>
                  <input className="form-control" type="date" value={form.date} onChange={set('date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('transfers.note')}</label>
                  <input className="form-control" placeholder={t('transfers.what_for')} value={form.description} onChange={set('description')} />
                </div>
              </div>
              {differentCurrency && form.amount && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  {t('transfers.receive')} {formatCurrency(parseFloat(form.amount) * parseFloat(form.exchange_rate || 1), toAcc.currency, locale)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {mutation.isPending ? t('transfers.processing') : t('transfers.transfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
