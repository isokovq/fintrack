import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, X, ArrowRight, ArrowLeftRight, ArrowDown, Pencil, Trash2, RefreshCw } from 'lucide-react';
import CurrencyConverter from '../components/ui/CurrencyConverter';

const emptyForm = { from_account_id: '', to_account_id: '', amount: '', receive_amount: '', exchange_rate: '1', description: '', date: new Date().toISOString().split('T')[0] };

export default function TransfersPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });
  const { data: transfers = [] } = useQuery({ queryKey: ['transfers'], queryFn: () => api.get('/transfers').then(r => r.data) });
  const { data: ratesData } = useQuery({ queryKey: ['exchange-rates'], queryFn: () => api.get('/exchange-rates').then(r => r.data) });

  const rates = ratesData?.rates || {};

  const fromAcc = accounts.find(a => a.id === form.from_account_id);
  const toAcc = accounts.find(a => a.id === form.to_account_id);
  const differentCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

  // Calculate CBU rate between two currencies (through UZS as base)
  const cbuRate = useMemo(() => {
    if (!fromAcc || !toAcc || !differentCurrency) return 1;
    const fromCcy = fromAcc.currency;
    const toCcy = toAcc.currency;
    // rates are: 1 unit of currency = X UZS
    const fromToUZS = fromCcy === 'UZS' ? 1 : (rates[fromCcy] || 1);
    const toToUZS = toCcy === 'UZS' ? 1 : (rates[toCcy] || 1);
    return fromToUZS / toToUZS;
  }, [fromAcc, toAcc, differentCurrency, rates]);

  // Auto-fill exchange rate from CBU when accounts change
  useEffect(() => {
    if (differentCurrency && cbuRate) {
      const rateStr = cbuRate.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      setForm(f => {
        const newForm = { ...f, exchange_rate: rateStr };
        // Recalculate receive amount if send amount exists
        if (f.amount) {
          newForm.receive_amount = (parseFloat(f.amount) * parseFloat(rateStr)).toFixed(2);
        }
        return newForm;
      });
    }
  }, [differentCurrency, cbuRate]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transfers'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/transfers', data),
    onSuccess: () => { invalidate(); closeModal(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/transfers/${id}`, data),
    onSuccess: () => { invalidate(); closeModal(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/transfers/${id}`),
    onSuccess: invalidate
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (tr) => {
    setEditingId(tr.id);
    const rate = parseFloat(tr.exchange_rate || 1);
    const amt = parseFloat(tr.amount || 0);
    setForm({
      from_account_id: tr.from_account_id,
      to_account_id: tr.to_account_id,
      amount: String(tr.amount),
      receive_amount: (amt * rate).toFixed(2),
      exchange_rate: String(tr.exchange_rate || 1),
      description: tr.description || '',
      date: tr.date ? tr.date.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = (tr) => {
    if (window.confirm(t('common.confirm_delete'))) {
      deleteMutation.mutate(tr.id);
    }
  };

  // When user types in "send" amount → calculate receive
  const onSendAmountChange = (e) => {
    const val = e.target.value;
    const rate = parseFloat(form.exchange_rate) || 1;
    const receiveAmt = val ? (parseFloat(val) * rate).toFixed(2) : '';
    setForm(f => ({ ...f, amount: val, receive_amount: receiveAmt }));
  };

  // When user types in "receive" amount → calculate send
  const onReceiveAmountChange = (e) => {
    const val = e.target.value;
    const rate = parseFloat(form.exchange_rate) || 1;
    const sendAmt = val && rate ? (parseFloat(val) / rate).toFixed(2) : '';
    setForm(f => ({ ...f, receive_amount: val, amount: sendAmt }));
  };

  // When user manually edits exchange rate → recalculate receive from send
  const onRateChange = (e) => {
    const val = e.target.value;
    const sendAmt = parseFloat(form.amount) || 0;
    const receiveAmt = sendAmt && val ? (sendAmt * parseFloat(val)).toFixed(2) : form.receive_amount;
    setForm(f => ({ ...f, exchange_rate: val, receive_amount: receiveAmt }));
  };

  // Reset rate to CBU
  const resetToCbuRate = () => {
    const rateStr = cbuRate.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    const sendAmt = parseFloat(form.amount) || 0;
    const receiveAmt = sendAmt ? (sendAmt * parseFloat(rateStr)).toFixed(2) : '';
    setForm(f => ({ ...f, exchange_rate: rateStr, receive_amount: receiveAmt }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount), exchange_rate: parseFloat(form.exchange_rate) };
    delete payload.receive_amount;
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('transfers.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('transfers.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); }}>
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
                  <th style={{ width: 80 }}></th>
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
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          → {formatCurrency(parseFloat(tr.amount) * parseFloat(tr.exchange_rate), tr.to_currency, locale)}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(tr.date, locale)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => openEdit(tr)} title={t('common.edit')} style={{ color: 'var(--text-secondary)' }}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => handleDelete(tr)} title={t('common.delete')} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <CurrencyConverter />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingId ? t('transfers.edit_title') : t('transfers.add_title')}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* From account */}
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">{t('transfers.from_account')}</label>
                  <select className="form-control" value={form.from_account_id} onChange={set('from_account_id')} required>
                    <option value="">{t('transfers.select_source')}</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency, locale)})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('transfers.currency')}</label>
                  <input className="form-control" value={fromAcc ? fromAcc.currency : '—'} disabled style={{ textAlign: 'center', fontWeight: 600, background: 'var(--bg-secondary)' }} />
                </div>
              </div>

              {/* To account */}
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">{t('transfers.to_account')}</label>
                  <select className="form-control" value={form.to_account_id} onChange={set('to_account_id')} required>
                    <option value="">{t('transfers.select_dest')}</option>
                    {accounts.filter(a => a.id !== form.from_account_id).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency, locale)})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('transfers.currency')}</label>
                  <input className="form-control" value={toAcc ? toAcc.currency : '—'} disabled style={{ textAlign: 'center', fontWeight: 600, background: 'var(--bg-secondary)' }} />
                </div>
              </div>

              {/* Amount section */}
              {differentCurrency ? (
                <>
                  {/* Send amount in FROM currency */}
                  <div className="form-group">
                    <label className="form-label">{t('transfers.you_send')} ({fromAcc.currency})</label>
                    <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={onSendAmountChange} required />
                  </div>

                  {/* Exchange rate display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <ArrowDown size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                      1 {fromAcc.currency} = <input
                        type="number"
                        step="0.000001"
                        value={form.exchange_rate}
                        onChange={onRateChange}
                        style={{ width: 90, border: 'none', background: 'transparent', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', outline: 'none', textAlign: 'center', padding: '2px 4px', borderBottom: '1px dashed var(--text-muted)' }}
                      /> {toAcc.currency}
                    </span>
                    <button type="button" onClick={resetToCbuRate} title={t('transfers.cbu_rate')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <RefreshCw size={12} /> CBU
                    </button>
                  </div>

                  {/* Receive amount in TO currency */}
                  <div className="form-group">
                    <label className="form-label">{t('transfers.they_receive')} ({toAcc.currency})</label>
                    <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.receive_amount} onChange={onReceiveAmountChange} />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">{t('transfers.amount')}</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
                </div>
              )}

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

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {isPending ? t('transfers.processing') : (editingId ? t('common.save') : t('transfers.transfer'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
