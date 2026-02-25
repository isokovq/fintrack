import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatShortDate } from '../utils/format';
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowRight, Sparkles } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
    retry: 1
  });

  const { data: statsData } = useQuery({
    queryKey: ['stats', 'month'],
    queryFn: () => api.get('/transactions/stats/summary?period=month').then(r => r.data),
    retry: 1
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['trend'],
    queryFn: () => api.get('/transactions/stats/trend').then(r => r.data),
    retry: 1
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => api.get('/transactions?limit=8').then(r => r.data),
    retry: 1
  });

  const { data: aiInsights = [] } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then(r => r.data),
    staleTime: 300000,
    retry: 1
  });

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);
  const income = parseFloat(statsData?.summary?.total_income || 0);
  const expense = parseFloat(statsData?.summary?.total_expense || 0);
  const saved = income - expense;
  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

  const trendFormatted = trendData.map(d => ({
    month: d.month?.substring(5),
    income: parseFloat(d.income || 0),
    expense: parseFloat(d.expense || 0)
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card" style={{ padding: '8px 12px', fontSize: 12, minWidth: 130, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontFamily: 'DM Mono', fontWeight: 600, marginBottom: 1 }}>
            {p.name}: {formatCurrency(p.value, user?.currency)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/transactions" className="btn btn-primary">
          <Plus size={15} /> Add Transaction
        </Link>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">Total Balance</div>
            <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}><Wallet size={16} color="var(--accent)" /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{formatCurrency(totalBalance, user?.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">Monthly Income</div>
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><TrendingUp size={16} color="var(--green)" /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{formatCurrency(income, user?.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{statsData?.summary?.income_count || 0} transactions</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">Monthly Expenses</div>
            <div className="stat-icon" style={{ background: 'var(--red-bg)' }}><TrendingDown size={16} color="var(--red)" /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{formatCurrency(expense, user?.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{statsData?.summary?.expense_count || 0} transactions</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">Net Savings</div>
            <div className="stat-icon" style={{ background: saved >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
              {saved >= 0 ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
            </div>
          </div>
          <div className="stat-value" style={{ color: saved >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(Math.abs(saved), user?.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{income > 0 ? `${savingsRate}% savings rate` : 'No income yet'}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Income vs Expenses</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 12 months</span>
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
                <Area type="monotone" dataKey="income" stroke="#059669" strokeWidth={2} fill="url(#incGrad)" name="Income" dot={false} />
                <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} fill="url(#expGrad)" name="Expense" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 50 }}>
              <p>Add transactions to see trends</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="var(--purple)" /> AI Insights
            </h3>
            <Link to="/ai" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          {aiInsights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aiInsights.slice(0, 3).map((insight, i) => (
                <div key={i} className={`alert alert-${insight.type === 'warning' ? 'warning' : insight.type === 'info' ? 'info' : 'success'}`} style={{ marginBottom: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 13 }}>{insight.emoji} {insight.title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>{insight.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Add more transactions for AI insights</p>
              <Link to="/ai" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Chat with AI</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent Transactions</h3>
            <Link to="/transactions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {txData?.transactions?.length > 0 ? txData.transactions.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon" style={{ background: tx.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                {tx.type === 'income' ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
              </div>
              <div className="tx-info">
                <div className="tx-desc">{tx.description || tx.category_name || 'Transaction'}</div>
                <div className="tx-meta">{tx.category_name || 'Uncategorized'} · {formatShortDate(tx.date)}</div>
              </div>
              <div className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user?.currency)}
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>No transactions yet</p>
              <Link to="/transactions" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                <Plus size={13} /> Add First Transaction
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Your Accounts</h3>
            <Link to="/accounts" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {accounts.length > 0 ? accounts.slice(0, 5).map(acc => (
            <div key={acc.id} className="tx-item">
              <div className="tx-icon" style={{ background: 'var(--bg-elevated)' }}>
                <CreditCard size={16} color="var(--text-secondary)" />
              </div>
              <div className="tx-info">
                <div className="tx-desc">{acc.name}</div>
                <div className="tx-meta" style={{ textTransform: 'capitalize' }}>{acc.type} · {acc.currency}</div>
              </div>
              <div className="tx-amount" style={{ color: parseFloat(acc.balance) >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
                {formatCurrency(acc.balance, acc.currency)}
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>No accounts added yet</p>
              <Link to="/accounts" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                <Plus size={13} /> Add Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
