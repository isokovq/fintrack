import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            background: 'var(--accent)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white', fontWeight: 800, letterSpacing: '-0.5px',
          }}>F</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>FinTrack</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('auth.tagline')}</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div className="tabs" style={{ marginBottom: 24 }}>
            <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setMode('login')}>{t('auth.signin')}</button>
            <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setMode('register')}>{t('auth.create')}</button>
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
              <input className="form-control" type="password" placeholder={t('auth.password_placeholder')} value={form.password} onChange={set('password')} required />
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
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 8 }}>
              {loading ? t('common.loading') : mode === 'login' ? t('auth.signin') : t('auth.create')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
