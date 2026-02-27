import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import TransactionModal from '../components/transactions/TransactionModal';
import { Plus, Pencil, Trash2, Search, Filter, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => {
      const params = new URLSearchParams({ limit: 20, offset: page * 20 });
      if (filters.type) params.set('type', filters.type);
      return api.get(`/transactions?${params}`).then(r => r.data);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    }
  });

  const txs = data?.transactions || [];
  const filtered = filters.search
    ? txs.filter(t => t.description?.toLowerCase().includes(filters.search.toLowerCase()) || t.category_name?.toLowerCase().includes(filters.search.toLowerCase()))
    : txs;

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('tx.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data?.total || 0} {t('tx.total')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
          <Plus size={15} /> {t('tx.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" placeholder={t('tx.search')} style={{ paddingLeft: 34 }}
              value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div className="tabs">
            {['', 'income', 'expense'].map(type => (
              <button key={type} className={`tab-btn ${filters.type === type ? 'active' : ''}`}
                onClick={() => setFilters(f => ({ ...f, type: type }))}>
                {type === '' ? t('common.all') : type === 'income' ? t('tx.income') : t('tx.expense')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CreditCard size={32} color="var(--text-muted)" /></div>
            <p>{t('tx.no_results')}</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
              <Plus size={14} /> {t('tx.add_first')}
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('tx.description')}</th>
                <th>{t('tx.category')}</th>
                <th>{t('tx.account')}</th>
                <th>{t('tx.date')}</th>
                <th style={{ textAlign: 'right' }}>{t('tx.amount')}</th>
                <th style={{ textAlign: 'right' }}>{t('tx.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{tx.description || '—'}</div>
                    {tx.ai_suggested_category && <span style={{ fontSize: 10, color: 'var(--purple)' }}>✨ {t('tx.ai_categorized')}</span>}
                  </td>
                  <td>
                    {tx.category_name ? (
                      <span className="badge" style={{ background: `${tx.category_color}22`, color: tx.category_color }}>
                        {tx.category_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{tx.account_name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatDate(tx.date, locale)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'DM Mono', fontWeight: 600, color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency, locale)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => { setEditTx(tx); setShowModal(true); }}><Pencil size={13} /></button>
                      <button className="btn-icon" style={{ color: 'var(--red)' }}
                        onClick={() => window.confirm(t('tx.delete_confirm')) && deleteMutation.mutate(tx.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data?.total > 20 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← {t('tx.prev')}</button>
            <span style={{ padding: '5px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{t('tx.page')} {page + 1}</span>
            <button className="btn btn-ghost btn-sm" disabled={(page + 1) * 20 >= data.total} onClick={() => setPage(p => p + 1)}>{t('tx.next')} →</button>
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => { setShowModal(false); setEditTx(null); }} editTx={editTx} />}
    </div>
  );
}
