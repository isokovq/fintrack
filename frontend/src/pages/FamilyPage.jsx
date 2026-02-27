import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { Users, Plus, LogOut, Copy, Check } from 'lucide-react';

export default function FamilyPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [mode, setMode] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: family, isLoading } = useQuery({
    queryKey: ['family'],
    queryFn: () => api.get('/family').then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/family/create', { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); setMode(null); }
  });

  const joinMutation = useMutation({
    mutationFn: (code) => api.post('/family/join', { invite_code: code }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); setMode(null); }
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post('/family/leave'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] })
  });

  const copyCode = () => {
    navigator.clipboard.writeText(family.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="page-content"><div className="empty-state">Loading...</div></div>;

  return (
    <div className="page-content fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('family.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('family.subtitle')}</p>
      </div>

      {!family ? (
        <div className="card" style={{ maxWidth: 500, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧‍👦</div>
          <h2 style={{ marginBottom: 8 }}>{t('family.create_join')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>{t('family.share_desc')}</p>

          {!mode && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setMode('create')}><Plus size={14} /> {t('family.create')}</button>
              <button className="btn btn-ghost" onClick={() => setMode('join')}><Users size={14} /> {t('family.join')}</button>
            </div>
          )}

          {mode === 'create' && (
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">{t('family.name')}</label>
                <input className="form-control" placeholder={t('family.name_placeholder')} value={familyName} onChange={e => setFamilyName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setMode(null)} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={() => createMutation.mutate(familyName)} style={{ flex: 2, justifyContent: 'center' }}>{t('family.create')}</button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">{t('family.invite_code')}</label>
                <input className="form-control" placeholder={t('family.code_placeholder')} value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} maxLength={8} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setMode(null)} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={() => joinMutation.mutate(inviteCode)} style={{ flex: 2, justifyContent: 'center' }}>{t('family.join')}</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
          {/* Family card */}
          <div className="card" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 32 }}>👨‍👩‍👧‍👦</div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{family.name}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{family.members?.length} {family.members?.length !== 1 ? t('family.members') : t('family.member')}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => window.confirm(t('family.leave_confirm')) && leaveMutation.mutate()} style={{ color: 'var(--red)' }}>
                <LogOut size={13} /> {t('family.leave')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('family.this_month_income')}</div>
                <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--green)', fontSize: 18 }}>{formatCurrency(family.stats?.total_income || 0, user?.currency, locale)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('family.this_month_expense')}</div>
                <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--red)', fontSize: 18 }}>{formatCurrency(family.stats?.total_expense || 0, user?.currency, locale)}</div>
              </div>
            </div>

            {family.owner_id === user?.id && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('family.invite_label')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 800, letterSpacing: 4, color: 'var(--accent)' }}>{family.invite_code}</div>
                  <button className="btn btn-ghost btn-sm" onClick={copyCode}>
                    {copied ? <><Check size={12} /> {t('common.copied')}</> : <><Copy size={12} /> {t('common.copy')}</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t('family.members_title')}</h3>
            {family.members?.map(m => (
              <div key={m.id} className="tx-item">
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{m.name} {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--accent)' }}>({t('family.you')})</span>}</div>
                  <div className="tx-meta">{m.email}</div>
                </div>
                {m.id === family.owner_id && <span className="badge badge-purple">{t('family.owner')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
