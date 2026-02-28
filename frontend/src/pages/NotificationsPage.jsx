import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const TYPE_CONFIG = {
  danger: { icon: AlertCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
  warning: { icon: AlertTriangle, color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  info: { icon: Info, color: 'var(--accent)', bg: 'var(--accent-glow)' },
};

export default function NotificationsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const unread = data?.unread || 0;

  if (isLoading) return (
    <div className="page-content page-transition">
      <div className="loading-screen" style={{ height: 200 }}><div className="loader" /></div>
    </div>
  );

  return (
    <div className="page-content page-transition">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{t('notif.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {unread > 0 ? `${unread} ${unread !== 1 ? t('notif.unread_plural') : t('notif.unread')}` : t('notif.caught_up')}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost" onClick={() => markAllRead.mutate()}>
            <CheckCheck size={14} /> {t('notif.mark_all')}
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          {notifications.map((notif, i) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 20px',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: notif.is_read ? 'transparent' : 'rgba(79,143,255,0.03)',
                  cursor: notif.is_read ? 'default' : 'pointer',
                }}
                onClick={() => !notif.is_read && markOneRead.mutate(notif.id)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: config.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color={config.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: notif.is_read ? 500 : 700, marginBottom: 2 }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {new Date(notif.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                {!notif.is_read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Bell size={32} color="var(--text-muted)" /></div>
            <p>{t('notif.empty')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {t('notif.info')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
