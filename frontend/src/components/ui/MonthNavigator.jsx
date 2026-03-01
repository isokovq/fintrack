import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function MonthNavigator({ month, year, onChange }) {
  const { locale, t } = useLanguage();

  const monthName = new Date(year, month - 1).toLocaleString(locale, { month: 'long' });

  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const next = () => {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  const goToday = () => {
    const now = new Date();
    onChange(now.getMonth() + 1, now.getFullYear());
  };

  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="month-navigator">
      <button className="btn-icon" onClick={prev} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <button className="month-nav-label" onClick={goToday} title={t('month_nav.today') || 'Go to current month'}>
        <Calendar size={14} />
        <span className="month-nav-text">{monthName} {year}</span>
      </button>
      <button className="btn-icon" onClick={next} aria-label="Next month" disabled={isCurrentMonth}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
