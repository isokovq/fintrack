import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart,
  Users, Calendar, Sparkles, Bell, LogOut, HandCoins, Repeat2,
  Menu, X, ChevronLeft, BarChart3, Sun, Moon, TrendingUp
} from 'lucide-react';

const FLAG_SVG = {
  us: (
    <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="30" fill="#B22234"/>
      <rect y="2.31" width="60" height="2.31" fill="#fff"/><rect y="6.92" width="60" height="2.31" fill="#fff"/>
      <rect y="11.54" width="60" height="2.31" fill="#fff"/><rect y="16.15" width="60" height="2.31" fill="#fff"/>
      <rect y="20.77" width="60" height="2.31" fill="#fff"/><rect y="25.38" width="60" height="2.31" fill="#fff"/>
      <rect width="24" height="16.15" fill="#3C3B6E"/>
      <g fill="#fff" fontSize="2.5" fontFamily="serif">
        {[...Array(5)].map((_, r) => [...Array(6)].map((_, c) => <circle key={`a${r}${c}`} cx={2 + c * 4} cy={1.5 + r * 3.2} r="0.8"/>))}
        {[...Array(4)].map((_, r) => [...Array(5)].map((_, c) => <circle key={`b${r}${c}`} cx={4 + c * 4} cy={3.1 + r * 3.2} r="0.8"/>))}
      </g>
    </svg>
  ),
  ru: (
    <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="10" fill="#fff"/><rect y="10" width="60" height="10" fill="#0039A6"/><rect y="20" width="60" height="10" fill="#D52B1E"/>
    </svg>
  ),
  uz: (
    <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="10" fill="#1EB53A"/><rect y="10" width="60" height="2" fill="#CE1126"/>
      <rect y="12" width="60" height="6" fill="#fff"/><rect y="18" width="60" height="2" fill="#CE1126"/>
      <rect y="20" width="60" height="10" fill="#0099B5"/>
      <circle cx="10" cy="5" r="3.5" fill="#fff"/><circle cx="11.5" cy="5" r="3" fill="#0099B5"/>
      {[...Array(3)].map((_, r) => [...Array(4 - (r === 2 ? 1 : 0))].map((_, c) => <circle key={`s${r}${c}`} cx={17 + c * 2.5} cy={2.5 + r * 2.5} r="0.6" fill="#fff"/>))}
    </svg>
  ),
};

const LANG_OPTIONS = [
  { code: 'en', cc: 'us', label: 'Eng' },
  { code: 'ru', cc: 'ru', label: 'Ру' },
  { code: 'uz', cc: 'uz', label: "O'z" },
];

function Flag({ cc, size = 20 }) {
  return <span style={{ width: size, height: Math.round(size * 0.75), display: 'inline-flex', flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>{FLAG_SVG[cc]}</span>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000
  });

  // Get current month stats for savings indicator
  const now = new Date();
  const { data: statsData } = useQuery({
    queryKey: ['stats', 'month', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => api.get(`/transactions/stats/summary?period=month&year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then(r => r.data),
    staleTime: 60000
  });

  const income = parseFloat(statsData?.summary?.total_income || 0);
  const expense = parseFloat(statsData?.summary?.total_expense || 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

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
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/subscriptions', label: t('nav.subscriptions'), icon: Repeat2 },
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
          <button className="btn-icon mobile-menu-btn" onClick={toggleTheme} style={{ marginRight: -4 }}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
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

        {/* Savings indicator */}
        {income > 0 && (
          <div style={{ padding: '0 14px 12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '12px 14px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={12} color={savingsRate >= 0 ? '#34d399' : '#f87171'} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {t('dash.savings_rate') || 'Savings'}
                  </span>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: savingsRate >= 20 ? '#34d399' : savingsRate >= 0 ? '#fbbf24' : '#f87171',
                  fontFamily: 'DM Mono',
                }}>
                  {savingsRate}%
                </span>
              </div>
              <div style={{
                height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(Math.max(savingsRate, 0), 100)}%`,
                  borderRadius: 2,
                  background: savingsRate >= 20 ? 'linear-gradient(90deg, #34d399, #10b981)' :
                    savingsRate >= 0 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' :
                    'linear-gradient(90deg, #f87171, #ef4444)',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
            </div>
          </div>
        )}

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
              <div style={{ fontSize: 11 }}>{user?.currency}</div>
            </div>
            <LogOut size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
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
        </div>
        <Outlet />
      </main>
    </div>
  );
}
