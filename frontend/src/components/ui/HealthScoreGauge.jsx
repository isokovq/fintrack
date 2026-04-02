import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import AnimatedNumber from './AnimatedNumber';
import { Shield, TrendingUp, Wallet, Target, PiggyBank } from 'lucide-react';

function GaugeArc({ score, color, size = 160 }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  return (
    <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
      {/* Background arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none" stroke="var(--border)" strokeWidth={strokeWidth} strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Score labels */}
      <text x={strokeWidth / 2 + 2} y={size / 2 + 16} fill="var(--text-muted)" fontSize="10" textAnchor="start">0</text>
      <text x={size - strokeWidth / 2 - 2} y={size / 2 + 16} fill="var(--text-muted)" fontSize="10" textAnchor="end">100</text>
    </svg>
  );
}

export default function HealthScoreGauge() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get('/ai/health-score').then(r => r.data),
    staleTime: 120000,
    retry: 1
  });

  if (isLoading || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 30 }}>
        <div className="loader" style={{ margin: '0 auto', width: 24, height: 24 }} />
      </div>
    );
  }

  const { score, grade, color, breakdown } = data;

  const metrics = [
    { key: 'savings_rate', icon: PiggyBank, label: t('health.savings') || 'Savings Rate', suffix: '%' },
    { key: 'budget_adherence', icon: Shield, label: t('health.budget') || 'Budget', suffix: '%' },
    { key: 'emergency_fund', icon: Wallet, label: t('health.emergency') || 'Emergency', suffix: ' mo' },
    { key: 'goals', icon: Target, label: t('health.goals') || 'Goals', suffix: '%' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} color={color} /> {t('health.title') || 'Financial Health'}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, color, padding: '2px 8px', background: `${color}15`, borderRadius: 6 }}>
          {grade}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: -10 }}>
        <GaugeArc score={score} color={color} size={160} />
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <AnimatedNumber value={score} duration={1500} format={n => Math.round(n).toString()} className="stat-value"
            style={{ fontSize: 32, fontWeight: 800, fontFamily: 'DM Mono', color }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {metrics.map(({ key, icon: Icon, label, suffix }) => {
          const metric = breakdown[key];
          if (!metric || metric.value === null) return null;
          return (
            <div key={key} style={{
              padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <Icon size={13} color="var(--text-muted)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono' }}>
                  {metric.value}{suffix}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
