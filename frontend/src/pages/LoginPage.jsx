import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password, form.currency);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="login-bg">
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="login-logo">
            <BarChart3 size={26} />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: '#ffffff' }}>
            FinTrack
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>{t('auth.tagline')}</p>
        </div>

        <div className="login-card">
          <div className="tabs" style={{ marginBottom: 24 }}>
            <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setMode('login')}>
              {t('auth.signin')}
            </button>
            <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setMode('register')}>
              {t('auth.create')}
            </button>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handle}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">{t('auth.name')}</label>
                <input className="form-control" placeholder={t('auth.name_placeholder')} value={form.name} onChange={set('name')} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input className="form-control" type="email" placeholder={t('auth.email_placeholder')} value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('auth.password_placeholder')}
                  value={form.password}
                  onChange={set('password')}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', padding: 4,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">{t('auth.currency')}</label>
                <select className="form-control" value={form.currency} onChange={set('currency')}>
                  <option value="USD">{t('auth.currency_usd')}</option>
                  <option value="EUR">{t('auth.currency_eur')}</option>
                  <option value="GBP">{t('auth.currency_gbp')}</option>
                  <option value="UZS">{t('auth.currency_uzs')}</option>
                  <option value="RUB">{t('auth.currency_rub')}</option>
                  <option value="JPY">{t('auth.currency_jpy')}</option>
                </select>
              </div>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14.5, marginTop: 8, fontWeight: 700 }}
            >
              {loading ? t('common.loading') : mode === 'login' ? t('auth.signin') : t('auth.create')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Secure & Private Finance Management
        </p>
      </div>
    </div>
  );
}
