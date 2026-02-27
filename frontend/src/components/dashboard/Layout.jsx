import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart,
  Users, Calendar, Sparkles, Bell, LogOut, HandCoins, Repeat2,
  Menu, X, ChevronLeft, BarChart3
} from 'lucide-react';

const LANG_OPTIONS = [
  { code: 'en', cc: 'us', label: 'Eng' },
  { code: 'ru', cc: 'ru', label: 'Ру' },
  { code: 'uz', cc: 'uz', label: "O'z" },
];

function Flag({ cc, size = 20 }) {
  return <img src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${cc}.png`} alt={cc} style={{ width: size, height: Math.round(size * 0.75), borderRadius: 2, objectFit: 'cover', display: 'block' }} />;
}

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
    setLangOpen(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Mobile language picker */}
          <div style={{ position: 'relative' }}>
            <button className="lang-toggle-mobile" onClick={() => setLangOpen(!langOpen)}>
              <Flag cc={currentLang.cc} size={18} />
              <span>{currentLang.label}</span>
            </button>
            {langOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setLangOpen(false)} />
                <div className="lang-dropdown" style={{ right: 0, top: '110%' }}>
                  {LANG_OPTIONS.map(opt => (
                    <button key={opt.code} className={`lang-option ${lang === opt.code ? 'active' : ''}`}
                      onClick={() => { setLang(opt.code); setLangOpen(false); }}>
                      <Flag cc={opt.cc} size={18} /> {opt.label}
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
          <div className="logo-icon">
            <BarChart3 size={18} color="white" />
          </div>
          <span className="logo-text">FinTrack</span>
          {/* X only shows on mobile via CSS */}
          <button className="btn-icon sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
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
        {/* Desktop top bar with language dropdown */}
        <div className="topbar">
          <div />
          <div style={{ position: 'relative' }}>
            <button className="lang-toggle-desktop" onClick={() => setLangOpen(!langOpen)}>
              <Flag cc={currentLang.cc} size={20} />
              <span>{currentLang.label}</span>
              <ChevronLeft size={12} style={{ transform: langOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
            </button>
            {langOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setLangOpen(false)} />
                <div className="lang-dropdown" style={{ right: 0, top: '110%' }}>
                  {LANG_OPTIONS.map(opt => (
                    <button key={opt.code} className={`lang-option ${lang === opt.code ? 'active' : ''}`}
                      onClick={() => { setLang(opt.code); setLangOpen(false); }}>
                      <Flag cc={opt.cc} size={18} /> {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
