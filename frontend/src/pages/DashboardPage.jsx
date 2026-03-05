import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatShortDate, formatLocalDate } from '../utils/format';
import { translateCategory } from '../translations';
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowRight, Sparkles, CreditCard, PieChart } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RPieChart, Pie, Cell
} from 'recharts';
import { SkeletonStatCard, SkeletonCard, SkeletonTxItem } from '../components/ui/Skeleton';
import Onboarding from '../components/ui/Onboarding';
import MonthNavigator from '../components/ui/MonthNavigator';

const DONUT_COLORS = ['#1a56db', '#059669', '#dc2626', '#d97706', '#7c3aed', '#06b6d4', '#ec4899', '#f97316'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, locale, lang } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  useEffect(() => {
    if (!localStorage.getItem('onboarding_done')) {
      setShowOnboarding(true);
    }
  }, []);

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
    retry: 1
  });

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['stats', 'month', month, year],
    queryFn: () => api.get(`/transactions/stats/summary?period=month&year=${year}&month=${month}`).then(r => r.data),
    retry: 1
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['trend'],
    queryFn: () => api.get('/transactions/stats/trend').then(r => r.data),
    retry: 1
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', 'recent', month, year],
    queryFn: () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      return api.get(`/transactions?limit=8&start_date=${startDate}&end_date=${endDate}`).then(r => r.data);
    },
    retry: 1
  });

  const { data: aiInsights = [] } = useQuery({
    queryKey: ['ai-insights', lang],
    queryFn: () => api.get('/ai/insights?lang=' + lang).then(r => r.data),
    staleTime: 300000,
    retry: 1
  });

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);
  const income = parseFloat(statsData?.summary?.total_income || 0);
  const expense = parseFloat(statsData?.summary?.total_expense || 0);
  const saved = income - expense;
  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

  const trendFormatted = trendData.map(d => {
    const monthNum = parseInt(d.month?.substring(5), 10);
    const monthLabel = formatLocalDate(new Date(2024, monthNum - 1), locale, { month: 'short' });
    return {
      month: monthLabel,
      income: parseFloat(d.income || 0),
      expense: parseFloat(d.expense || 0)
    };
  });

  // Donut chart data from category breakdown
  const categoryData = (statsData?.byCategory || [])
    .filter(c => c.type === 'expense' && parseFloat(c.total) > 0)
    .slice(0, 8)
    .map((c, i) => ({ name: translateCategory(c.name, lang) || 'Other', value: parseFloat(c.total), color: c.color || DONUT_COLORS[i % DONUT_COLORS.length] }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.greeting_morning') : hour < 17 ? t('dash.greeting_afternoon') : t('dash.greeting_evening');

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card" style={{ padding: '8px 12px', fontSize: 12, minWidth: 130, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontFamily: 'DM Mono', fontWeight: 600, marginBottom: 1 }}>
            {p.name}: {formatCurrency(p.value, user?.currency, locale)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-content page-transition stagger-in">
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {isCurrentMonth
              ? formatLocalDate(new Date(), locale, { weekday: 'long', month: 'long', day: 'numeric' })
              : formatLocalDate(new Date(year, month - 1), locale, { month: 'long', year: 'numeric' })
            }
          </p>
        </div>
      </div>

      {/* Month Navigator */}
      <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />

      {/* Stats */}
      {loadingStats ? (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{t('dash.total_balance')}</div>
              <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}><Wallet size={16} color="var(--accent)" /></div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{formatCurrency(totalBalance, user?.currency, locale)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{accounts.length} {accounts.length !== 1 ? t('dash.accounts_count_plural') : t('dash.accounts_count')}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{t('dash.monthly_income')}</div>
              <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><TrendingUp size={16} color="var(--green)" /></div>
            </div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{formatCurrency(income, user?.currency, locale)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{statsData?.summary?.income_count || 0} {t('dash.transactions_count')}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{t('dash.monthly_expenses')}</div>
              <div className="stat-icon" style={{ background: 'var(--red-bg)' }}><TrendingDown size={16} color="var(--red)" /></div>
            </div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{formatCurrency(expense, user?.currency, locale)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{statsData?.summary?.expense_count || 0} {t('dash.transactions_count')}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{t('dash.net_savings')}</div>
              <div className="stat-icon" style={{ background: saved >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                {saved >= 0 ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
              </div>
            </div>
            <div className="stat-value" style={{ color: saved >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(Math.abs(saved), user?.currency, locale)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{income > 0 ? `${savingsRate}% ${t('dash.savings_rate')}` : t('dash.no_income')}</div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('dash.income_vs_expense')}</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('dash.last_12')}</span>
          </div>
          {trendFormatted.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trendFormatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#059669" strokeWidth={2} fill="url(#incGrad)" name={t('dash.income')} dot={false} />
                <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} fill="url(#expGrad)" name={t('dash.expense')} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 50 }}>
              <p>{t('dash.add_tx_trends')}</p>
            </div>
          )}
        </div>

        {/* Spending by Category Donut */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PieChart size={14} color="var(--accent)" /> {t('dash.spending_by_category') || 'Spending by Category'}
            </h3>
            <Link to="/budget" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>{t('dash.view_all')}</Link>
          </div>
          {categoryData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={140} height={140}>
                <RPieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, user?.currency, locale)} />
                </RPieChart>
              </ResponsiveContainer>
              <div className="donut-legend" style={{ flexDirection: 'column' }}>
                {categoryData.map((c, i) => (
                  <div key={i} className="donut-legend-item">
                    <div className="donut-legend-dot" style={{ background: c.color }} />
                    <span>{c.name}</span>
                    <span style={{ fontFamily: 'DM Mono', fontWeight: 600, marginLeft: 4 }}>{formatCurrency(c.value, user?.currency, locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('dash.more_tx_insights')}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--purple)" /> {t('dash.ai_insights')}
          </h3>
          <Link to="/ai" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>{t('dash.view_all')}</Link>
        </div>
        {aiInsights.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {aiInsights.slice(0, 3).map((insight, i) => (
              <div key={i} className={`alert alert-${insight.type === 'warning' ? 'warning' : insight.type === 'info' ? 'info' : 'success'}`} style={{ marginBottom: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 13 }}>{insight.emoji} {insight.title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>{insight.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{t('dash.more_tx_insights')}</p>
            <Link to="/ai" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>{t('dash.chat_ai')}</Link>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('dash.recent_tx')}</h3>
            <Link to="/transactions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('dash.view_all')} <ArrowRight size={12} />
            </Link>
          </div>
          {loadingTx ? (
            <>{[1,2,3,4].map(i => <SkeletonTxItem key={i} />)}</>
          ) : txData?.transactions?.length > 0 ? txData.transactions.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon" style={{ background: tx.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                {tx.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
              </div>
              <div className="tx-info">
                <div className="tx-desc">{tx.description || tx.category_name || '—'}</div>
                <div className="tx-meta">{translateCategory(tx.category_name, lang) || t('common.all')} · {formatShortDate(tx.date, locale)}</div>
              </div>
              <div className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency, locale)}
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>{t('dash.no_tx')}</p>
              <Link to="/transactions" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                <Plus size={13} /> {t('dash.add_first_tx')}
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('dash.your_accounts')}</h3>
            <Link to="/accounts" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('dash.manage')} <ArrowRight size={12} />
            </Link>
          </div>
          {loadingAccounts ? (
            <>{[1,2,3].map(i => <SkeletonTxItem key={i} />)}</>
          ) : accounts.length > 0 ? accounts.slice(0, 5).map(acc => (
            <div key={acc.id} className="tx-item">
              <div className="tx-icon" style={{ background: 'var(--bg-elevated)' }}>
                <CreditCard size={16} color="var(--text-secondary)" />
              </div>
              <div className="tx-info">
                <div className="tx-desc">{acc.name}</div>
                <div className="tx-meta" style={{ textTransform: 'capitalize' }}>{acc.type} · {acc.currency}</div>
              </div>
              <div className="tx-amount" style={{ color: parseFloat(acc.balance) >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
                {formatCurrency(acc.balance, acc.currency, locale)}
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>{t('dash.no_accounts')}</p>
              <Link to="/accounts" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                <Plus size={13} /> {t('dash.add_account')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
