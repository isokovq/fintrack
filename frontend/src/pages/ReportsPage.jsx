import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency, formatLocalDate, getMonthName } from '../utils/format';
import { translateCategory } from '../translations';
import { ChevronLeft, ChevronRight, Download, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell
} from 'recharts';
import AnimatedNumber from '../components/ui/AnimatedNumber';

const COLORS = ['#1a56db', '#059669', '#dc2626', '#d97706', '#7c3aed', '#06b6d4', '#ec4899', '#f97316'];

export default function ReportsPage() {
  const { user } = useAuth();
  const { t, locale, lang } = useLanguage();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const chartsRef = useRef(null);

  const { data: monthlyData, isLoading: loadingMonthly } = useQuery({
    queryKey: ['reports', 'monthly-summary', year],
    queryFn: () => api.get(`/reports/monthly-summary?year=${year}`).then(r => r.data)
  });

  const { data: catData, isLoading: loadingCat } = useQuery({
    queryKey: ['reports', 'category-trends'],
    queryFn: () => api.get('/reports/category-trends?months=6').then(r => r.data)
  });

  const { data: nwData, isLoading: loadingNW } = useQuery({
    queryKey: ['reports', 'net-worth'],
    queryFn: () => api.get('/reports/net-worth').then(r => r.data)
  });

  const months = (monthlyData?.months || []).map(m => ({
    ...m,
    name: getMonthName(m.month, locale).substring(0, 3),
  }));

  const yearIncome = months.reduce((s, m) => s + m.income, 0);
  const yearExpense = months.reduce((s, m) => s + m.expense, 0);
  const yearSavings = yearIncome - yearExpense;

  // Category trend data: pivot for stacked bar
  const catMonths = [];
  if (catData?.categories?.length) {
    const allMonths = [...new Set(catData.categories.flatMap(c => c.trend.map(t => t.month)))].sort();
    for (const month of allMonths) {
      const entry = { month: getMonthName(parseInt(month.split('-')[1]), locale).substring(0, 3) };
      for (const cat of catData.categories) {
        const found = cat.trend.find(t => t.month === month);
        entry[cat.name] = found ? found.amount : 0;
      }
      catMonths.push(entry);
    }
  }

  // Net worth line data
  const netWorthData = (nwData?.netWorth || []).map(nw => ({
    month: getMonthName(parseInt(nw.month.split('-')[1]), locale).substring(0, 3),
    balance: nw.balance
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card" style={{ padding: '8px 12px', fontSize: 12, minWidth: 140, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
        {payload.map(p => (
          <div key={p.dataKey} style={{ color: p.color || p.fill, fontFamily: 'DM Mono', fontWeight: 600, marginBottom: 1 }}>
            {translateCategory(p.dataKey, lang) || p.dataKey}: {formatCurrency(p.value, user?.currency, locale)}
          </div>
        ))}
      </div>
    );
  };

  const exportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(chartsRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, w, h);
      pdf.save(`fintrack-report-${year}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
  };

  return (
    <div className="page-content page-transition stagger-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            {t('reports.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('reports.subtitle')}</p>
        </div>
        <button className="btn btn-ghost" onClick={exportPDF} style={{ gap: 6 }}>
          <Download size={14} /> {t('reports.export_pdf')}
        </button>
      </div>

      {/* Year selector */}
      <div className="month-navigator" style={{ marginBottom: 20 }}>
        <button className="btn-icon" onClick={() => setYear(y => y - 1)}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{year}</span>
        <button className="btn-icon" onClick={() => setYear(y => y + 1)} disabled={year >= now.getFullYear()}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Year summary stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">{t('reports.year_income')}</div>
          <AnimatedNumber value={yearIncome} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: 'var(--green)' }} />
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('reports.year_expense')}</div>
          <AnimatedNumber value={yearExpense} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: 'var(--red)' }} />
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('reports.year_savings')}</div>
          <AnimatedNumber value={Math.abs(yearSavings)} duration={1000} format={n => formatCurrency(n, user?.currency, locale)} className="stat-value" style={{ color: yearSavings >= 0 ? 'var(--green)' : 'var(--red)' }} />
        </div>
      </div>

      <div ref={chartsRef}>
        {/* Chart 1: Monthly Breakdown */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={14} color="var(--accent)" /> {t('reports.monthly_breakdown')}
            </h3>
          </div>
          {months.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={months} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name={t('reports.income')} fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t('reports.expense')} fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name={t('reports.savings')} fill="#1a56db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 50 }}><p>{t('reports.no_data')}</p></div>
          )}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Chart 2: Category Trends */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PieChart size={14} color="var(--purple)" /> {t('reports.category_trends')}
              </h3>
            </div>
            {catMonths.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catMonths} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {(catData?.categories || []).map((cat, i) => (
                    <Bar key={cat.name} dataKey={cat.name} stackId="cats" fill={cat.color || COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 50 }}><p>{t('reports.no_data')}</p></div>
            )}
          </div>

          {/* Chart 3: Net Worth */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} color="var(--green)" /> {t('reports.net_worth')}
              </h3>
            </div>
            {netWorthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={netWorthData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a56db" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="balance" name={t('reports.balance')} stroke="#1a56db" strokeWidth={2} fill="url(#nwGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 50 }}><p>{t('reports.no_data')}</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
