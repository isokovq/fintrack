import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import { translateCategory } from '../translations';
import TransactionModal from '../components/transactions/TransactionModal';
import { Plus, Pencil, Trash2, Search, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonTableRow } from '../components/ui/Skeleton';
import SwipeRow from '../components/ui/SwipeRow';
import MonthNavigator from '../components/ui/MonthNavigator';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { t, locale, lang } = useLanguage();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [page, setPage] = useState(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page, month, year],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20', offset: String(page * 20), start_date: startDate, end_date: endDate });
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
    ? txs.filter(tx => tx.description?.toLowerCase().includes(filters.search.toLowerCase()) || tx.category_name?.toLowerCase().includes(filters.search.toLowerCase()))
    : txs;

  const handleMonthChange = (m, y) => {
    setMonth(m);
    setYear(y);
    setPage(0);
  };

  const renderMobileRow = (tx) => {
    const row = (
      <div className="tx-item" style={{ padding: '12px 16px' }}>
        <div className="tx-icon" style={{ background: tx.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
          {tx.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
        </div>
        <div className="tx-info">
          <div className="tx-desc">{tx.description || '—'}</div>
          <div className="tx-meta">
            {translateCategory(tx.category_name, lang) || '—'} · {formatDate(tx.date, locale)}
            {tx.ai_suggested_category && <span style={{ color: 'var(--purple)', marginLeft: 4 }}>AI</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency, locale)}
          </div>
          <button className="btn-icon" style={{ border: 'none', width: 24, height: 24, marginTop: 2 }}
            onClick={() => { setEditTx(tx); setShowModal(true); }}>
            <Pencil size={11} />
          </button>
        </div>
      </div>
    );

    return (
      <SwipeRow key={tx.id} onDelete={() => deleteMutation.mutate(tx.id)} confirmText={t('tx.delete_confirm')}>
        {row}
      </SwipeRow>
    );
  };

  return (
    <div className="page-content page-transition">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('tx.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data?.total || 0} {t('tx.total')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
          <Plus size={15} /> {t('tx.add')}
        </button>
      </div>

      {/* Month Navigator */}
      <MonthNavigator month={month} year={year} onChange={handleMonthChange} />

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

      <div className="card" style={isMobile ? { padding: 0 } : {}}>
        {isLoading ? (
          isMobile ? (
            <div style={{ padding: 16 }}>{[1,2,3,4,5].map(i => (
              <div key={i} className="tx-item"><div className="skeleton" style={{ width: 38, height: 38, borderRadius: 8 }} /><div style={{ flex: 1 }}><div className="skeleton" style={{ width: '70%', height: 14, marginBottom: 6, borderRadius: 4 }} /><div className="skeleton" style={{ width: '40%', height: 10, borderRadius: 4 }} /></div><div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} /></div>
            ))}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('tx.description')}</th><th>{t('tx.category')}</th><th>{t('tx.account')}</th>
                  <th>{t('tx.date')}</th><th style={{ textAlign: 'right' }}>{t('tx.amount')}</th><th style={{ textAlign: 'right' }}>{t('tx.actions')}</th>
                </tr>
              </thead>
              <tbody>{[1,2,3,4,5].map(i => <SkeletonTableRow key={i} cols={6} />)}</tbody>
            </table>
          )
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CreditCard size={32} color="var(--text-muted)" /></div>
            <p>{t('tx.no_results')}</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
              <Plus size={14} /> {t('tx.add_first')}
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile: swipeable card rows */
          <div>{filtered.map(tx => renderMobileRow(tx))}</div>
        ) : (
          /* Desktop: table view */
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
                        {translateCategory(tx.category_name, lang)}
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
