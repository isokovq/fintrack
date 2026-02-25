import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart,
  Users, Calendar, Sparkles, Bell, LogOut, HandCoins, Repeat2,
  Menu, X, ChevronLeft
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000
  });

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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

  const isHome = location.pathname === '/';

  // Find current page title
  const currentPage = navItems.find(item => {
    if (item.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.to);
  });
  const pageTitle = location.pathname === '/notifications' ? 'Notifications' : currentPage?.label || 'FinTrack';

  return (
    <div className="layout">
      {/* Mobile header */}
      <header className="mobile-header">
        {isHome ? (
          <button className="btn-icon mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
        ) : (
          <button className="btn-icon mobile-menu-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </button>
        )}
        <span className="mobile-title">{pageTitle}</span>
        <button className="btn-icon mobile-menu-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
          <Bell size={18} />
          {notifData?.unread > 0 && <span className="mobile-notif-dot" />}
        </button>
      </header>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.5px' }}>F</div>
          <span className="logo-text">FinTrack</span>
          <button className="btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
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
