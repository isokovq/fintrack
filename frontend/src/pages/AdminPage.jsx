import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import {
  Users, TrendingUp, CreditCard, ArrowLeftRight, Shield, Search,
  ChevronLeft, ChevronRight, Eye, Trash2, UserCheck, UserX, Crown,
  BarChart3, Activity, DollarSign, X, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text)' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({ userId, onClose, t }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => api.get(`/admin/users/${userId}`).then(r => r.data),
    enabled: !!userId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-user', userId]);
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-stats']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-stats']);
      onClose();
    }
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loader" />
        </div>
      </div>
    </div>
  );

  if (!user) return null;

  const ms = user.monthly_stats || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 18
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.email}</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* User info badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className={`badge ${user.is_admin ? 'badge-purple' : 'badge-gray'}`}>
            {user.is_admin ? 'Admin' : 'User'}
          </span>
          <span className={`badge ${user.plan === 'pro' ? 'badge-blue' : 'badge-gray'}`}>
            {(user.plan || 'free').toUpperCase()}
          </span>
          <span className={`badge ${user.is_active !== false ? 'badge-green' : 'badge-red'}`}>
            {user.is_active !== false ? t('admin.active') : t('admin.inactive')}
          </span>
          <span className="badge badge-gray">{user.currency}</span>
        </div>

        {/* Monthly stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{t('admin.income')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', fontFamily: 'DM Mono' }}>
              {formatCurrency(ms.income || 0, user.currency)}
            </div>
          </div>
          <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{t('admin.expense')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', fontFamily: 'DM Mono' }}>
              {formatCurrency(ms.expense || 0, user.currency)}
            </div>
          </div>
          <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{t('admin.transactions')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text)' }}>
              {ms.tx_count || 0}
            </div>
          </div>
        </div>

        {/* Accounts */}
        {user.accounts?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>{t('admin.accounts')}</div>
            {user.accounts.map(acc => (
              <div key={acc.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{acc.name} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>({acc.type})</span></span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono', color: 'var(--text)' }}>
                  {formatCurrency(acc.balance, acc.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent transactions */}
        {user.recent_transactions?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>{t('admin.recent_tx')}</div>
            {user.recent_transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{tx.description || tx.category_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{new Date(tx.date).toLocaleDateString()}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono',
                  color: tx.type === 'income' ? '#22c55e' : '#ef4444'
                }}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, user.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
          <button
            className={`btn btn-sm ${user.plan === 'pro' ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => updateMutation.mutate({ plan: user.plan === 'pro' ? 'free' : 'pro' })}
            disabled={updateMutation.isPending}
          >
            <Crown size={13} />
            {user.plan === 'pro' ? t('admin.downgrade') : t('admin.upgrade_pro')}
          </button>
          <button
            className={`btn btn-sm ${user.is_active !== false ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => updateMutation.mutate({ is_active: user.is_active === false })}
            disabled={updateMutation.isPending}
          >
            {user.is_active !== false ? <UserX size={13} /> : <UserCheck size={13} />}
            {user.is_active !== false ? t('admin.deactivate') : t('admin.activate')}
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => updateMutation.mutate({ is_admin: !user.is_admin })}
            disabled={updateMutation.isPending}
          >
            <Shield size={13} />
            {user.is_admin ? t('admin.remove_admin') : t('admin.make_admin')}
          </button>
          {!confirmDelete ? (
            <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> {t('admin.delete')}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{t('admin.confirm_delete')}</span>
              <button className="btn btn-sm btn-danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {t('admin.yes_delete')}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setConfirmDelete(false)}>
                {t('admin.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const limit = 20;

  // Redirect non-admin
  if (!user?.is_admin) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Shield size={48} color="var(--text-dim)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>{t('admin.access_denied')}</h2>
          <p style={{ color: 'var(--text-dim)' }}>{t('admin.admin_only')}</p>
        </div>
      </div>
    );
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data)
  });

  const { data: growth = [] } = useQuery({
    queryKey: ['admin-growth'],
    queryFn: () => api.get('/admin/growth').then(r => r.data)
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', search, planFilter, sort, order, page],
    queryFn: () => api.get('/admin/users', {
      params: { search: search || undefined, plan: planFilter || undefined, sort, order, limit, offset: page * limit }
    }).then(r => r.data)
  });

  const users = usersData?.users || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  const toggleSort = (col) => {
    if (sort === col) setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(col); setOrder('DESC'); }
    setPage(0);
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return null;
    return <span style={{ fontSize: 10, marginLeft: 4 }}>{order === 'ASC' ? '↑' : '↓'}</span>;
  };

  const growthData = growth.map(g => ({
    month: g.month.slice(5),
    users: parseInt(g.new_users)
  }));

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Shield size={22} color="var(--accent)" />
        <h1 className="page-title" style={{ margin: 0 }}>{t('admin.title')}</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={Users} label={t('admin.total_users')} value={stats?.total_users || 0} color="#4f46e5"
          sub={`+${stats?.new_users_this_month || 0} ${t('admin.this_month')}`} />
        <StatCard icon={Activity} label={t('admin.active_users')} value={stats?.active_users || 0} color="#22c55e" />
        <StatCard icon={ArrowLeftRight} label={t('admin.total_tx')} value={stats?.total_transactions || 0} color="#f59e0b"
          sub={`+${stats?.transactions_this_month || 0} ${t('admin.this_month')}`} />
        <StatCard icon={Crown} label={t('admin.pro_users')} value={stats?.pro_users || 0} color="#8b5cf6"
          sub={`${stats?.free_users || 0} ${t('admin.free')}`} />
        <StatCard icon={TrendingUp} label={t('admin.income_month')} value={formatCurrency(stats?.total_income_this_month || 0, 'USD')} color="#22c55e" />
        <StatCard icon={DollarSign} label={t('admin.expense_month')} value={formatCurrency(stats?.total_expense_this_month || 0, 'USD')} color="#ef4444" />
      </div>

      {/* Growth Chart */}
      {growthData.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
            <BarChart3 size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t('admin.user_growth')}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
              />
              <Bar dataKey="users" fill="var(--accent)" radius={[4, 4, 0, 0]} name={t('admin.new_users')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Users Table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            <Users size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t('admin.all_users')} ({totalUsers})
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder={t('admin.search_users')}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="input"
                style={{ paddingLeft: 32, height: 34, fontSize: 12, width: 200 }}
              />
            </div>
            <select
              value={planFilter}
              onChange={e => { setPlanFilter(e.target.value); setPage(0); }}
              className="input"
              style={{ height: 34, fontSize: 12, width: 100 }}
            >
              <option value="">{t('admin.all_plans')}</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={thStyle} onClick={() => toggleSort('name')}>
                  {t('admin.name')}<SortIcon col="name" />
                </th>
                <th style={thStyle} onClick={() => toggleSort('email')}>
                  {t('admin.email')}<SortIcon col="email" />
                </th>
                <th style={thStyle}>{t('admin.plan_col')}</th>
                <th style={thStyle}>{t('admin.status')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('total_balance')}>
                  {t('admin.balance')}<SortIcon col="total_balance" />
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('tx_count')}>
                  {t('admin.txs')}<SortIcon col="tx_count" />
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('created_at')}>
                  {t('admin.joined')}<SortIcon col="created_at" />
                </th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center' }}><div className="loader" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>{t('admin.no_users')}</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onClick={() => setSelectedUser(u.id)}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: u.is_admin ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600, fontSize: 11, flexShrink: 0
                      }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{u.name}</span>
                      {u.is_admin && <Shield size={11} color="#8b5cf6" />}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-dim)' }}>{u.email}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${u.plan === 'pro' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {(u.plan || 'free').toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: u.is_active !== false ? '#22c55e' : '#ef4444',
                      display: 'inline-block', marginRight: 6
                    }} />
                    <span style={{ fontSize: 11 }}>{u.is_active !== false ? t('admin.active') : t('admin.inactive')}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'DM Mono', fontWeight: 500 }}>
                    {formatCurrency(u.total_balance || 0, u.currency)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'DM Mono' }}>{u.tx_count}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-dim)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); setSelectedUser(u.id); }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {page + 1} / {totalPages}
            </span>
            <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {selectedUser && <UserDetailModal userId={selectedUser} onClose={() => setSelectedUser(null)} t={t} />}
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--text-dim)',
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  userSelect: 'none'
};

const tdStyle = {
  padding: '10px 12px',
  fontSize: 12,
  whiteSpace: 'nowrap'
};
