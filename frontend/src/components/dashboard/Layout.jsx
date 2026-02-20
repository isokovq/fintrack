import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart,
  Users, Calendar, Sparkles, Bell, LogOut, HandCoins, Repeat2
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000
  });

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/accounts', label: 'Accounts', icon: CreditCard },
    { to: '/transfers', label: 'Transfers', icon: Repeat2 },
    { to: '/budget', label: 'Budget', icon: PieChart },
    { to: '/debts', label: 'Debts', icon: HandCoins },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/family', label: 'Family', icon: Users },
    { to: '/ai', label: 'AI Assistant', icon: Sparkles },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">💰</div>
          <span className="logo-text">FinTrack</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {label === 'AI Assistant' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(79,143,255,0.3)' }}>NEW</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => navigate('/notifications')}
            style={{ width: '100%', marginBottom: 4 }}
          >
            <Bell size={16} />
            Notifications
            {notifData?.unread > 0 && <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{notifData.unread}</span>}
          </button>
          <div className="user-pill" onClick={logout}>
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.currency}</div>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
