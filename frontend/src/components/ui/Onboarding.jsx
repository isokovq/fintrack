import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CreditCard, ArrowLeftRight, PieChart, Sparkles, ChevronRight, X, Wallet, Target } from 'lucide-react';

const STEPS = [
  { icon: Wallet, color: 'var(--accent)', bg: 'var(--accent-glow)', key: 'welcome' },
  { icon: CreditCard, color: 'var(--green)', bg: 'var(--green-bg)', key: 'accounts' },
  { icon: ArrowLeftRight, color: 'var(--red)', bg: 'var(--red-bg)', key: 'transactions' },
  { icon: PieChart, color: 'var(--yellow)', bg: 'var(--yellow-bg)', key: 'budget' },
  { icon: Sparkles, color: 'var(--purple)', bg: 'rgba(124,58,237,0.06)', key: 'ai' },
  { icon: Target, color: 'var(--green)', bg: 'var(--green-bg)', key: 'ready' },
];

const CONTENT = {
  en: [
    { title: 'Welcome to FinTrack!', desc: 'Your personal finance tracker powered by AI. Let us show you around in 30 seconds.' },
    { title: 'Add Your Accounts', desc: 'Start by adding your bank accounts, wallets, or cards. Track balances across all your money in one place.' },
    { title: 'Track Transactions', desc: 'Log income and expenses. Our AI will automatically categorize them for you.' },
    { title: 'Set Budgets', desc: 'Set monthly spending limits by category. Get alerts when you\'re close to your limit.' },
    { title: 'AI Insights', desc: 'Get personalized spending analysis and smart suggestions to save more money.' },
    { title: 'You\'re All Set!', desc: 'Start by adding your first account. You can always find help in the AI chat.' },
  ],
  ru: [
    { title: 'Добро пожаловать в FinTrack!', desc: 'Ваш персональный финансовый трекер с ИИ. Покажем всё за 30 секунд.' },
    { title: 'Добавьте счета', desc: 'Начните с добавления банковских счетов, кошельков или карт. Отслеживайте все деньги в одном месте.' },
    { title: 'Отслеживайте транзакции', desc: 'Записывайте доходы и расходы. Наш ИИ автоматически их категоризирует.' },
    { title: 'Установите бюджеты', desc: 'Задайте месячные лимиты расходов по категориям. Получайте уведомления при приближении к лимиту.' },
    { title: 'ИИ-аналитика', desc: 'Получайте персональный анализ расходов и умные советы для экономии.' },
    { title: 'Всё готово!', desc: 'Начните с добавления первого счёта. Помощь всегда доступна в ИИ-чате.' },
  ],
  uz: [
    { title: 'FinTrack-ga xush kelibsiz!', desc: 'Sun\'iy intellekt bilan ishlaydigan shaxsiy moliya trekeri. 30 soniyada ko\'rsatamiz.' },
    { title: 'Hisoblaringizni qo\'shing', desc: 'Bank hisoblaringiz, hamyonlaringiz yoki kartalaringizni qo\'shing. Barcha pulingizni bir joyda kuzating.' },
    { title: 'Tranzaksiyalarni kuzating', desc: 'Daromad va xarajatlarni yozing. Sun\'iy intellekt ularni avtomatik kategoriyalaydi.' },
    { title: 'Byudjet belgilang', desc: 'Kategoriya bo\'yicha oylik xarajat limitlarini belgilang. Limitga yaqinlashganda xabar oling.' },
    { title: 'AI tahlil', desc: 'Shaxsiy xarajat tahlili va pul tejash bo\'yicha aqlli maslahatlar oling.' },
    { title: 'Hammasi tayyor!', desc: 'Birinchi hisobingizni qo\'shishdan boshlang. Yordam har doim AI chatda mavjud.' },
  ],
};

export default function Onboarding({ onComplete }) {
  const { lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const content = CONTENT[lang] || CONTENT.en;
  const current = STEPS[step];
  const Icon = current.icon;

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = () => {
    setVisible(false);
    localStorage.setItem('onboarding_done', 'true');
    setTimeout(() => onComplete(), 200);
  };

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" onClick={e => e.target === e.currentTarget && finish()}>
      <div className="onboarding-card">
        <button className="btn-icon onboarding-skip" onClick={finish} style={{ position: 'absolute', top: 12, right: 12, border: 'none' }}>
          <X size={16} />
        </button>

        <div className="onboarding-icon" style={{ background: current.bg }}>
          <Icon size={32} color={current.color} />
        </div>

        <h2 className="onboarding-title">{content[step].title}</h2>
        <p className="onboarding-desc">{content[step].desc}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)} style={{ flex: 1, justifyContent: 'center' }}>
              {lang === 'ru' ? 'Назад' : lang === 'uz' ? 'Orqaga' : 'Back'}
            </button>
          )}
          <button className="btn btn-primary" onClick={next} style={{ flex: 2, justifyContent: 'center' }}>
            {step === STEPS.length - 1
              ? (lang === 'ru' ? 'Начать!' : lang === 'uz' ? 'Boshlash!' : 'Get Started!')
              : (lang === 'ru' ? 'Далее' : lang === 'uz' ? 'Keyingi' : 'Next')}
            {step < STEPS.length - 1 && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
