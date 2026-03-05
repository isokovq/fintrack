import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import { X, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { translateCategory } from '../../translations';

export default function TransactionModal({ onClose, editTx = null }) {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: 'expense', amount: '', description: '', date: new Date().toISOString().split('T')[0],
    account_id: '', category_id: '', is_recurring: false, recurring_interval: 'monthly'
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (editTx) {
      setForm({
        type: editTx.type, amount: editTx.amount, description: editTx.description || '',
        date: editTx.date?.split('T')[0] || editTx.date,
        account_id: editTx.account_id || '', category_id: editTx.category_id || '',
        is_recurring: editTx.is_recurring || false, recurring_interval: editTx.recurring_interval || 'monthly'
      });
    }
  }, [editTx]);

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', form.type],
    queryFn: () => api.get(`/categories?type=${form.type}`).then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: (data) => editTx ? api.put(`/transactions/${editTx.id}`, data) : api.post('/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    }
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const suggestCategory = async () => {
    if (!form.description) return;
    setAiLoading(true);
    try {
      const res = await api.post('/ai/suggest-category', { description: form.description, type: form.type });
      if (res.data.category_id) setForm(f => ({ ...f, category_id: res.data.category_id }));
    } catch (e) {}
    setAiLoading(false);
  };

  const handle = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editTx ? t('txm.edit_title') : t('txm.add_title')}</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">{t('txm.type')}</label>
            <div className="tabs">
              {['expense', 'income'].map(type => (
                <button key={type} type="button" className={`tab-btn ${form.type === type ? 'active' : ''}`}
                  style={{ flex: 1, textTransform: 'capitalize' }} onClick={() => setForm(f => ({ ...f, type: type, category_id: '' }))}>
                  {type === 'expense' ? <TrendingDown size={13} /> : <TrendingUp size={13} />} {type === 'expense' ? t('txm.expense') : t('txm.income')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('txm.amount')}</label>
              <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('txm.date')}</label>
              <input className="form-control" type="date" value={form.date} onChange={set('date')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('txm.description')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-control" placeholder={t('txm.desc_placeholder')} value={form.description} onChange={set('description')} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={suggestCategory} disabled={aiLoading} title="AI suggest category" style={{ flexShrink: 0, gap: 4 }}>
                <Sparkles size={13} style={{ color: 'var(--purple)' }} />
                {aiLoading ? '...' : 'AI'}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('txm.account')}</label>
              <select className="form-control" value={form.account_id} onChange={set('account_id')} required>
                <option value="">{t('txm.select_account')}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('txm.category')}</label>
              <select className="form-control" value={form.category_id} onChange={set('category_id')}>
                <option value="">{t('txm.select_category')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{translateCategory(c.name, lang)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} />
            <label htmlFor="recurring" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('txm.recurring')}</label>
          </div>

          {form.is_recurring && (
            <div className="form-group">
              <label className="form-label">{t('txm.interval')}</label>
              <select className="form-control" value={form.recurring_interval} onChange={set('recurring_interval')}>
                <option value="daily">{t('txm.daily')}</option>
                <option value="weekly">{t('txm.weekly')}</option>
                <option value="monthly">{t('txm.monthly')}</option>
                <option value="yearly">{t('txm.yearly')}</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
              {mutation.isPending ? t('txm.saving') : editTx ? t('common.save') : `${t('txm.add_title')} ${form.type === 'income' ? t('txm.add_income') : t('txm.add_expense')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
