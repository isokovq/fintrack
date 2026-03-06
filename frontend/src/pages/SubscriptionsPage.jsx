import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import { translateCategory } from '../translations';
import { Repeat, Plus, XCircle, Calendar, DollarSign, Hash, TrendingDown, TrendingUp } from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import TransactionModal from '../components/transactions/TransactionModal';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { t, locale, lang } = useLanguage();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => api.get('/recurring').then(r => r.data)
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/recurring/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const subscriptions = data?.subscriptions || [];
  const totalMonthly = data?.total_monthly_commitment || 0;
  const activeCount = data?.active_count || 0;

  const nextPayment = subscriptions.length > 0 ? subscriptions[0] : null;

  const intervalLabel = (interval) => {
    switch (interval) {
      case 'daily': return t('subs.daily');
      case 'weekly': return t('subs.weekly');
      case 'monthly': return t('subs.monthly');
      case 'yearly': return t('subs.yearly');
      default: return interval;
    }
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t('subs.today');
    if (diff === 1) return t('subs.tomorrow');
    if (diff < 0) return t('subs.overdue');
    return `${diff} ${t('subs.days_left')}`;
  };

  return (
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            {t('subs.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subs.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> {t('subs.add')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('subs.monthly_commitment')}</div>
            <div className="stat-icon" style={{ background: 'var(--red-bg)' }}><DollarSign size={16} color="var(--red)" /></div>
          </div>
          <AnimatedNumber value={totalMonthly} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: 'var(--red)' }} />
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('subs.active_count')}</div>
            <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}><Hash size={16} color="var(--accent)" /></div>
          </div>
          <AnimatedNumber value={activeCount} duration={800} format={n => Math.round(n).toString()} className="stat-value" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('subs.next_payment')}</div>
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><Calendar size={16} color="var(--green)" /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: 16 }}>
            {nextPayment ? formatDate(nextPayment.next_payment_date, locale) : '—'}
          </div>
          {nextPayment && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {nextPayment.description} · {formatCurrency(nextPayment.amount, nextPayment.account_currency || user?.currency, locale)}
            </div>
          )}
        </div>
      </div>

      {/* Subscription List */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Repeat size={14} color="var(--accent)" /> {t('subs.all_subscriptions')}
          </h3>
        </div>

        {isLoading ? (
          <div className="empty-state" style={{ padding: 40 }}>Loading...</div>
        ) : subscriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {subscriptions.map(sub => (
              <div key={sub.id} className="tx-item" style={{ padding: '12px 0' }}>
                <div className="tx-icon" style={{ background: sub.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                  {sub.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
                </div>
                <div className="tx-info" style={{ flex: 1 }}>
                  <div className="tx-desc">{sub.description || translateCategory(sub.category_name, lang) || '—'}</div>
                  <div className="tx-meta">
                    {translateCategory(sub.category_name, lang)} · {intervalLabel(sub.interval)} · {sub.account_name}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginRight: 12 }}>
                  <div className="tx-amount" style={{ color: sub.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {sub.type === 'income' ? '+' : '-'}{formatCurrency(sub.amount, sub.account_currency || user?.currency, locale)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {daysUntil(sub.next_payment_date)}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  style={{ color: 'var(--red)', flexShrink: 0 }}
                  title={t('subs.cancel')}
                  onClick={() => window.confirm(t('subs.cancel_confirm')) && cancelMutation.mutate(sub.id)}
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 50 }}>
            <Repeat size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>{t('subs.no_subscriptions')}</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
              <Plus size={13} /> {t('subs.add')}
            </button>
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
