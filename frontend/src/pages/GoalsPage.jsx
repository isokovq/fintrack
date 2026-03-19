import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatDate, daysUntil } from '../utils/format';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { Plus, X, Trash2, Pencil, Target, TrendingUp, Calendar, Coins } from 'lucide-react';

const GOAL_COLORS = ['#4f46e5', '#059669', '#dc2626', '#d97706', '#7c3aed', '#06b6d4', '#ec4899', '#f97316'];
const GOAL_ICONS = ['target', 'home', 'car', 'plane', 'gift', 'laptop', 'heart', 'star'];

function ProgressRing({ percent, color, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showContribute, setShowContribute] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', deadline: '', color: '#4f46e5', icon: 'target' });
  const [contributeAmount, setContributeAmount] = useState('');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get('/goals').then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: (data) => editGoal ? api.put(`/goals/${editGoal.id}`, data) : api.post('/goals', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); closeModal(); }
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/goals/${id}/contribute`, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setShowContribute(null); setContributeAmount(''); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] })
  });

  const openEdit = (goal) => {
    setEditGoal(goal);
    setForm({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
      color: goal.color || '#4f46e5',
      icon: goal.icon || 'target'
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditGoal(null);
    setForm({ name: '', target_amount: '', current_amount: '0', deadline: '', color: '#4f46e5', icon: 'target' });
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const completedCount = goals.filter(g => parseFloat(g.current_amount) >= parseFloat(g.target_amount)).length;

  return (
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            {t('goals.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditGoal(null); setShowModal(true); }}>
          <Plus size={15} /> {t('goals.add')}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('goals.total_saved')}</div>
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><Coins size={16} color="var(--green)" /></div>
          </div>
          <AnimatedNumber value={totalSaved} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: 'var(--green)' }} />
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('goals.total_target')}</div>
            <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}><Target size={16} color="var(--accent)" /></div>
          </div>
          <AnimatedNumber value={totalTarget} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('goals.overall_progress')}</div>
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><TrendingUp size={16} color="var(--green)" /></div>
          </div>
          <AnimatedNumber value={overallPercent} duration={800} format={n => `${Math.round(n)}%`} className="stat-value" style={{ color: overallPercent >= 50 ? 'var(--green)' : 'var(--accent)' }} />
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="stat-label">{t('goals.completed')}</div>
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}><Target size={16} color="var(--green)" /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{completedCount} / {goals.length}</div>
        </div>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="empty-state" style={{ padding: 50 }}>Loading...</div>
      ) : goals.length > 0 ? (
        <div className="grid-3">
          {goals.map(goal => {
            const current = parseFloat(goal.current_amount || 0);
            const target = parseFloat(goal.target_amount || 0);
            const percent = target > 0 ? Math.round((current / target) * 100) : 0;
            const isComplete = current >= target;
            const remaining = Math.max(target - current, 0);
            const deadlineDays = goal.deadline ? daysUntil(goal.deadline) : null;

            return (
              <div key={goal.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Colored top strip */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: isComplete
                    ? 'linear-gradient(90deg, #22c55e, #10b981)'
                    : `linear-gradient(90deg, ${goal.color || '#4f46e5'}, ${goal.color || '#4f46e5'}88)`,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingTop: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.name}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon" onClick={() => openEdit(goal)}><Pencil size={12} /></button>
                    <button className="btn-icon" style={{ color: 'var(--red)' }}
                      onClick={() => window.confirm(t('common.confirm_delete')) && deleteMutation.mutate(goal.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Progress Ring Center */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
                  <ProgressRing percent={percent} color={isComplete ? '#22c55e' : (goal.color || '#4f46e5')} size={110} strokeWidth={8} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono', color: isComplete ? 'var(--green)' : 'var(--text-primary)' }}>
                      {percent}%
                    </div>
                  </div>
                </div>

                {/* Amount info */}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {formatCurrency(current, user?.currency, locale)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('goals.of')} {formatCurrency(target, user?.currency, locale)}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{
                    height: '100%', width: `${Math.min(percent, 100)}%`, borderRadius: 3,
                    background: isComplete
                      ? 'linear-gradient(90deg, #22c55e, #10b981)'
                      : `linear-gradient(90deg, ${goal.color || '#4f46e5'}, ${goal.color || '#4f46e5'}cc)`,
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>

                {/* Footer info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{t('goals.remaining')}: {formatCurrency(remaining, user?.currency, locale)}</span>
                  {goal.deadline && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: deadlineDays < 0 ? 'var(--red)' : deadlineDays < 30 ? '#f59e0b' : 'var(--text-muted)' }}>
                      <Calendar size={10} />
                      {deadlineDays < 0 ? t('goals.overdue') : `${deadlineDays} ${t('goals.days_left')}`}
                    </span>
                  )}
                </div>

                {/* Contribute button */}
                {!isComplete && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                    onClick={() => { setShowContribute(goal); setContributeAmount(''); }}
                  >
                    <Plus size={14} /> {t('goals.contribute')}
                  </button>
                )}
                {isComplete && (
                  <div style={{
                    textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 700,
                    color: 'var(--green)', background: 'var(--green-bg)', borderRadius: 8
                  }}>
                    {t('goals.achieved')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <Target size={40} style={{ opacity: 0.15, marginBottom: 16 }} />
            <p style={{ fontSize: 15, marginBottom: 4 }}>{t('goals.no_goals')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{t('goals.no_goals_hint')}</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={14} /> {t('goals.add_first')}
            </button>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContribute && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowContribute(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2>{t('goals.contribute_to')} {showContribute.name}</h2>
              <button className="btn-icon" onClick={() => setShowContribute(null)}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <ProgressRing
                  percent={parseFloat(showContribute.target_amount) > 0 ? Math.round((parseFloat(showContribute.current_amount) / parseFloat(showContribute.target_amount)) * 100) : 0}
                  color={showContribute.color || '#4f46e5'}
                  size={80}
                  strokeWidth={6}
                />
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                {formatCurrency(showContribute.current_amount, user?.currency, locale)} / {formatCurrency(showContribute.target_amount, user?.currency, locale)}
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                {t('goals.remaining')}: {formatCurrency(Math.max(parseFloat(showContribute.target_amount) - parseFloat(showContribute.current_amount), 0), user?.currency, locale)}
              </div>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const amt = parseFloat(contributeAmount);
              if (amt > 0) contributeMutation.mutate({ id: showContribute.id, amount: amt });
            }}>
              <div className="form-group">
                <label className="form-label">{t('goals.amount')}</label>
                <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00"
                  value={contributeAmount} onChange={e => setContributeAmount(e.target.value)} required autoFocus />
              </div>
              {/* Quick amount buttons */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {[10000, 50000, 100000, 500000].map(amt => (
                  <button key={amt} type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setContributeAmount(String(amt))}
                    style={{ fontSize: 11, padding: '4px 10px' }}>
                    +{formatCurrency(amt, user?.currency, locale)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowContribute(null)} style={{ flex: 1, justifyContent: 'center' }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={contributeMutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {contributeMutation.isPending ? '...' : t('goals.contribute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editGoal ? t('goals.edit') : t('goals.create')}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              mutation.mutate({
                name: form.name,
                target_amount: parseFloat(form.target_amount) || 0,
                current_amount: parseFloat(form.current_amount) || 0,
                deadline: form.deadline || null,
                color: form.color,
                icon: form.icon
              });
            }}>
              <div className="form-group">
                <label className="form-label">{t('goals.name')}</label>
                <input className="form-control" placeholder={t('goals.name_placeholder')} value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('goals.target')}</label>
                  <input className="form-control" type="number" step="0.01" placeholder="1,000,000" value={form.target_amount} onChange={set('target_amount')} required />
                </div>
                {!editGoal && (
                  <div className="form-group">
                    <label className="form-label">{t('goals.initial_amount')}</label>
                    <input className="form-control" type="number" step="0.01" placeholder="0" value={form.current_amount} onChange={set('current_amount')} />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t('goals.deadline')}</label>
                <input className="form-control" type="date" value={form.deadline} onChange={set('deadline')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('goals.color')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GOAL_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c,
                        border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} style={{ flex: 1, justifyContent: 'center' }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                  {mutation.isPending ? '...' : editGoal ? t('common.save') : t('goals.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
