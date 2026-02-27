import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart,
  Users, Calendar, Sparkles, Bell, LogOut, HandCoins, Repeat2,
  Menu, X, ChevronLeft
} from 'lucide-react';

const LANG_OPTIONS = [
  { code: 'en', flag: '🇺🇸', label: 'Eng' },
  { code: 'ru', flag: '🇷🇺', label: 'Ру' },
  { code: 'uz', flag: '🇺🇿', label: "O'z" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, exact: true },
    { to: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { to: '/accounts', label: t('nav.accounts'), icon: CreditCard },
    { to: '/transfers', label: t('nav.transfers'), icon: Repeat2 },
    { to: '/budget', label: t('nav.budget'), icon: PieChart },
    { to: '/debts', label: t('nav.debts'), icon: HandCoins },
    { to: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { to: '/family', label: t('nav.family'), icon: Users },
    { to: '/ai', label: t('nav.ai'), icon: Sparkles },
  ];

  const isHome = location.pathname === '/';
  const currentPage = navItems.find(item => {
    if (item.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.to);
  });
  const pageTitle = location.pathname === '/notifications' ? t('nav.notifications') : currentPage?.label || 'FinTrack';
  const currentLang = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative' }}>
            <button className="btn-icon mobile-menu-btn" onClick={() => setLangOpen(!langOpen)} style={{ fontSize: 14 }}>
              {currentLang.flag}
            </button>
            {langOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setLangOpen(false)} />
                <div className="lang-dropdown" style={{ right: 0 }}>
                  {LANG_OPTIONS.map(opt => (
                    <button key={opt.code} className={`lang-option ${lang === opt.code ? 'active' : ''}`}
                      onClick={() => { setLang(opt.code); setLangOpen(false); }}>
                      <span>{opt.flag}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn-icon mobile-menu-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
            <Bell size={18} />
            {notifData?.unread > 0 && <span className="mobile-notif-dot" />}
          </button>
        </div>
      </header>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.5px' }}>F</div>
          <span className="logo-text">FinTrack</span>
          <button className="btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Desktop language switcher */}
        <div className="lang-switcher-desktop">
          {LANG_OPTIONS.map(opt => (
            <button key={opt.code} className={`lang-pill ${lang === opt.code ? 'active' : ''}`}
              onClick={() => setLang(opt.code)}>
              <span style={{ fontSize: 13 }}>{opt.flag}</span> {opt.label}
            </button>
          ))}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => navigate('/notifications')} style={{ width: '100%', marginBottom: 4 }}>
            <Bell size={16} />
            {t('nav.notifications')}
            {notifData?.unread > 0 && <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{notifData.unread}</span>}
          </button>
          <div className="user-pill" onClick={logout}>
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
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
