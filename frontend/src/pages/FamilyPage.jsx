import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { Users, Plus, LogOut, Copy, Check, Receipt, PieChart, ArrowRightLeft, ChevronDown, ChevronUp, CheckCircle, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function FamilyPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [mode, setMode] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Shared expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [expandedExpense, setExpandedExpense] = useState(null);

  const { data: family, isLoading } = useQuery({
    queryKey: ['family'],
    queryFn: () => api.get('/family').then(r => r.data)
  });

  const { data: sharedExpenses = [] } = useQuery({
    queryKey: ['family-expenses'],
    queryFn: () => api.get('/family/expenses').then(r => r.data),
    enabled: !!family
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['family-balances'],
    queryFn: () => api.get('/family/balances').then(r => r.data),
    enabled: !!family
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

  const addExpenseMutation = useMutation({
    mutationFn: (data) => api.post('/family/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-expenses'] });
      qc.invalidateQueries({ queryKey: ['family-balances'] });
      setShowExpenseForm(false);
      setExpDesc('');
      setExpAmount('');
      setCustomSplits({});
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ expenseId, userId }) => api.put(`/family/expenses/${expenseId}/pay/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-expenses'] });
      qc.invalidateQueries({ queryKey: ['family-balances'] });
    }
  });

  const copyCode = () => {
    navigator.clipboard.writeText(family.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddExpense = () => {
    if (!expDesc || !expAmount || !family?.members) return;
    const total = parseFloat(expAmount);
    let splits;

    if (splitType === 'equal') {
      const perPerson = Math.round((total / family.members.length) * 100) / 100;
      splits = family.members.map(m => ({ user_id: m.id, amount: perPerson }));
    } else {
      splits = family.members.map(m => ({
        user_id: m.id,
        amount: parseFloat(customSplits[m.id] || 0)
      }));
    }

    addExpenseMutation.mutate({ description: expDesc, total_amount: total, splits });
  };

  // Per-member stats for dashboard
  const memberStats = useMemo(() => {
    if (!family?.members) return [];
    return family.members.map(m => ({
      ...m,
      income: parseFloat(m.stats?.income || 0),
      expense: parseFloat(m.stats?.expense || 0),
      txCount: parseInt(m.stats?.tx_count || 0)
    })).sort((a, b) => b.expense - a.expense);
  }, [family]);

  const totalFamilyExpense = useMemo(() => {
    return memberStats.reduce((sum, m) => sum + m.expense, 0);
  }, [memberStats]);

  if (isLoading) return <div className="page-content"><div className="empty-state">{t('common.loading')}</div></div>;

  // No family — show create/join
  if (!family) {
    return (
      <div className="page-content page-transition">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('family.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('family.subtitle')}</p>
        </div>
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
      </div>
    );
  }

  // Has family — show tabs
  return (
    <div className="page-content page-transition">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{family.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{family.members?.length} {family.members?.length !== 1 ? t('family.members') : t('family.member')}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => window.confirm(t('family.leave_confirm')) && leaveMutation.mutate()} style={{ color: 'var(--red)' }}>
            <LogOut size={13} /> {t('family.leave')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="family-tabs">
        <button className={`family-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <PieChart size={14} /> {t('family.tab_overview') || 'Overview'}
        </button>
        <button className={`family-tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          <Receipt size={14} /> {t('family.tab_expenses') || 'Split Bills'}
        </button>
        <button className={`family-tab ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
          <ArrowRightLeft size={14} /> {t('family.tab_balances') || 'Balances'}
        </button>
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && (
        <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Family Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('family.this_month_income')}</div>
              <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--green)', fontSize: 20 }}>
                {formatCurrency(family.stats?.total_income || 0, user?.currency, locale)}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('family.this_month_expense')}</div>
              <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--red)', fontSize: 20 }}>
                {formatCurrency(family.stats?.total_expense || 0, user?.currency, locale)}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('family.net_savings') || 'Net Savings'}</div>
              <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--accent)', fontSize: 20 }}>
                {formatCurrency((family.stats?.total_income || 0) - (family.stats?.total_expense || 0), user?.currency, locale)}
              </div>
            </div>
          </div>

          {/* Invite code for owner */}
          {family.owner_id === user?.id && (
            <div className="card" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('family.invite_label')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 800, letterSpacing: 4, color: 'var(--accent)' }}>{family.invite_code}</div>
                <button className="btn btn-ghost btn-sm" onClick={copyCode}>
                  {copied ? <><Check size={12} /> {t('common.copied')}</> : <><Copy size={12} /> {t('common.copy')}</>}
                </button>
              </div>
            </div>
          )}

          {/* Per-member spending breakdown */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t('family.member_breakdown') || 'Member Breakdown'}</h3>
            {memberStats.map(m => {
              const pct = totalFamilyExpense > 0 ? (m.expense / totalFamilyExpense) * 100 : 0;
              return (
                <div key={m.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {m.name} {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--accent)' }}>{t('family.you')}</span>}
                        {m.id === family.owner_id && <span className="badge badge-purple" style={{ marginLeft: 6 }}>{t('family.owner')}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.txCount} {t('dash.transactions_count')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--green)' }}><TrendingUp size={12} /> {formatCurrency(m.income, user?.currency, locale)}</span>
                        <span style={{ color: 'var(--red)' }}><TrendingDown size={12} /> {formatCurrency(m.expense, user?.currency, locale)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Expense bar */}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: m.id === user?.id ? 'var(--accent)' : 'var(--red)', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Categories */}
          {family.topCategories?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t('family.top_categories') || 'Top Family Categories'}</h3>
              {family.topCategories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < family.topCategories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || 'var(--accent)' }} />
                    <span style={{ fontSize: 14 }}>{cat.name || 'Uncategorized'}</span>
                  </div>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: 14, color: 'var(--red)' }}>
                    {formatCurrency(cat.total, user?.currency, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== SHARED EXPENSES TAB ====== */}
      {activeTab === 'expenses' && (
        <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('family.shared_expenses') || 'Shared Expenses'}</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExpenseForm(!showExpenseForm)}>
              <Plus size={14} /> {t('family.add_expense') || 'Split a Bill'}
            </button>
          </div>

          {/* Add Expense Form */}
          {showExpenseForm && (
            <div className="card" style={{ border: '2px solid var(--accent)', background: 'var(--accent-glow)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t('family.new_split') || 'New Split Bill'}</h4>
              <div className="form-group">
                <label className="form-label">{t('family.expense_desc') || 'Description'}</label>
                <input className="form-control" placeholder={t('family.expense_desc_placeholder') || 'e.g. Dinner, Groceries, Rent...'} value={expDesc} onChange={e => setExpDesc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('family.total_amount') || 'Total Amount'}</label>
                <input className="form-control" type="number" placeholder="0.00" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('family.split_method') || 'Split Method'}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`btn btn-sm ${splitType === 'equal' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSplitType('equal')}>
                    {t('family.split_equal') || 'Equal Split'}
                  </button>
                  <button className={`btn btn-sm ${splitType === 'custom' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSplitType('custom')}>
                    {t('family.split_custom') || 'Custom'}
                  </button>
                </div>
              </div>

              {splitType === 'equal' && expAmount && (
                <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('family.each_pays') || 'Each person pays'}: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(parseFloat(expAmount) / (family.members?.length || 1), user?.currency, locale)}</strong>
                </div>
              )}

              {splitType === 'custom' && family.members?.map(m => (
                <div key={m.id} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{m.name}</span>
                  <input className="form-control" type="number" placeholder="0.00" style={{ width: 120 }} value={customSplits[m.id] || ''} onChange={e => setCustomSplits(prev => ({ ...prev, [m.id]: e.target.value }))} />
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowExpenseForm(false)} style={{ flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={handleAddExpense} disabled={!expDesc || !expAmount} style={{ flex: 2, justifyContent: 'center' }}>
                  <Receipt size={14} /> {t('family.create_split') || 'Create Split'}
                </button>
              </div>
            </div>
          )}

          {/* Expense List */}
          {sharedExpenses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              <Receipt size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{t('family.no_shared_expenses') || 'No shared expenses yet'}</p>
              <p style={{ fontSize: 12 }}>{t('family.no_shared_desc') || 'Split bills with your family to track who owes what'}</p>
            </div>
          ) : (
            sharedExpenses.map(exp => {
              const isExpanded = expandedExpense === exp.id;
              const allPaid = exp.splits?.every(s => s.is_paid);
              return (
                <div key={exp.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setExpandedExpense(isExpanded ? null : exp.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: allPaid ? 'var(--green-bg)' : 'var(--yellow-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {allPaid ? <CheckCircle size={18} style={{ color: 'var(--green)' }} /> : <Clock size={18} style={{ color: 'var(--yellow)' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{exp.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {t('family.paid_by') || 'Paid by'} {exp.created_by_name} · {new Date(exp.date).toLocaleDateString(locale)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 16 }}>
                        {formatCurrency(exp.total_amount, exp.currency, locale)}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background: 'var(--bg-base)' }}>
                      {exp.splits?.map(split => (
                        <div key={split.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: split.is_paid ? 'var(--green)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: split.is_paid ? '#fff' : 'var(--text-primary)' }}>
                              {split.user_name?.charAt(0)}
                            </div>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{split.user_name}</span>
                              {split.is_paid && <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 6 }}>{t('family.paid') || 'Paid'}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 600 }}>
                              {formatCurrency(split.amount, exp.currency, locale)}
                            </span>
                            {!split.is_paid && (exp.created_by === user?.id || split.user_id === user?.id) && (
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate({ expenseId: exp.id, userId: split.user_id }); }}>
                                <Check size={12} /> {t('family.mark_paid') || 'Mark Paid'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ====== BALANCES TAB ====== */}
      {activeTab === 'balances' && (
        <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('family.balance_summary') || 'Balance Summary'}</h3>

          {balances.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              <ArrowRightLeft size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{t('family.no_balances') || 'All settled up!'}</p>
              <p style={{ fontSize: 12 }}>{t('family.no_balances_desc') || 'No outstanding balances between family members'}</p>
            </div>
          ) : (
            balances.map((bal, i) => {
              const owes = parseFloat(bal.owes || 0);
              const owedTo = parseFloat(bal.owed_to_them || 0);
              const net = owedTo - owes;
              return (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: net >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: net >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 16 }}>
                      {bal.user_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{bal.user_name} {bal.user_id === user?.id && <span style={{ fontSize: 11, color: 'var(--accent)' }}>{t('family.you')}</span>}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {owes > 0 && <span>{t('family.owes') || 'Owes'}: <span style={{ color: 'var(--red)' }}>{formatCurrency(owes, user?.currency, locale)}</span></span>}
                        {owes > 0 && owedTo > 0 && ' · '}
                        {owedTo > 0 && <span>{t('family.owed') || 'Owed'}: <span style={{ color: 'var(--green)' }}>{formatCurrency(owedTo, user?.currency, locale)}</span></span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 18, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {net >= 0 ? '+' : ''}{formatCurrency(Math.abs(net), user?.currency, locale)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {net >= 0 ? (t('family.gets_back') || 'gets back') : (t('family.needs_to_pay') || 'needs to pay')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
