'use client';
import { useState, useMemo } from 'react';
import { trpc } from '../../utils/trpc';
import { TrendingUp, TrendingDown, Settings, Plus, RotateCcw, AlertTriangle, ChevronDown, ChevronRight, Calendar, BarChart3, List, RefreshCw, Check, X } from 'lucide-react';

const BUCKETS = [
  { key: 'PURCHASE_DEVELOPMENT', label: 'التطوير والمشتريات والتشغيل', icon: '🛒', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { key: 'MAINTENANCE', label: 'الصيانة', icon: '🔧', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { key: 'LABOR', label: 'العمال', icon: '👷', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  { key: 'CAPITAL', label: 'رأس المال', icon: '💰', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
];

const TX_TYPE_LABELS: Record<string, string> = {
  DAILY_ALLOCATION: 'تخصيص يومي',
  EXPENSE: 'مصروف',
  PAYROLL: 'راتب',
  PROFIT_DISTRIBUTION: 'توزيع أرباح',
  MANUAL_ADJUSTMENT: 'تعديل يدوي',
  REVERSAL: 'عكس حركة',
};

function fmt(n: number) {
  return new Intl.NumberFormat('ar-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' د.ب';
}

function getPeriodDates(period: string, customFrom: string, customTo: string) {
  const now = new Date();
  const today = new Date(now); today.setHours(0,0,0,0);
  if (period === 'today') return { from: today.toISOString().slice(0,10), to: today.toISOString().slice(0,10) };
  if (period === 'week') { const s = new Date(today); s.setDate(s.getDate() - s.getDay()); return { from: s.toISOString().slice(0,10), to: today.toISOString().slice(0,10) }; }
  if (period === 'month') { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { from: s.toISOString().slice(0,10), to: today.toISOString().slice(0,10) }; }
  if (period === 'year') { const s = new Date(today.getFullYear(), 0, 1); return { from: s.toISOString().slice(0,10), to: today.toISOString().slice(0,10) }; }
  if (period === 'all') { return { from: '2020-01-01', to: today.toISOString().slice(0,10) }; }
  return { from: customFrom, to: customTo };
}

export default function IncomeAllocationPage() {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().slice(0,10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0,10));
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'settings'>('overview');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [adjForm, setAdjForm] = useState({ bucket: 'MAINTENANCE', direction: 'CREDIT', amount: '', reason: '', note: '' });
  const [initForm, setInitForm] = useState({ purchasePct: 40, maintenancePct: 10, laborPct: 30, capitalPct: 20, effectiveFrom: new Date().toISOString().slice(0,10) });
  const [settingsForm, setSettingsForm] = useState({ purchasePct: 40, maintenancePct: 10, laborPct: 30, capitalPct: 20, notes: '' });
  const [ledgerBucket, setLedgerBucket] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  const { from, to } = getPeriodDates(period, customFrom, customTo);

  const rulesQ = trpc.getIncomeAllocationRules.useQuery(undefined, { retry: false });
  const isInit = rulesQ.data && rulesQ.data.length > 0;

  const summaryQ = trpc.getIncomeAllocationSummary.useQuery({ from, to }, { enabled: !!isInit });
  const daysQ = trpc.getIncomeAllocationDays.useQuery({ from, to, page: 1, limit: 60 }, { enabled: !!isInit });
  const ledgerQ = trpc.getIncomeAllocationLedger.useQuery({ from, to, bucket: ledgerBucket || undefined, transactionType: ledgerType || undefined, page: ledgerPage, limit: 50 }, { enabled: !!isInit && activeTab === 'ledger' });
  const balancesQ = trpc.getCurrentAllocationBalances.useQuery(undefined, { enabled: !!isInit });

  const utils = trpc.useUtils();
  const initMut = trpc.initIncomeAllocation.useMutation({ onSuccess: () => { setShowInitModal(false); utils.getIncomeAllocationRules.invalidate(); utils.getCurrentAllocationBalances.invalidate(); } });
  const adjMut = trpc.createIncomeAllocationAdjustment.useMutation({ onSuccess: () => { setShowAdjModal(false); setAdjForm({ bucket: 'MAINTENANCE', direction: 'CREDIT', amount: '', reason: '', note: '' }); utils.getIncomeAllocationSummary.invalidate(); utils.getCurrentAllocationBalances.invalidate(); utils.getIncomeAllocationLedger.invalidate(); } });
  const updateRulesMut = trpc.updateIncomeAllocationRules.useMutation({ onSuccess: () => { utils.getIncomeAllocationRules.invalidate(); alert('تم تحديث النسب بنجاح'); } });
  const ensureTodayMut = trpc.ensureTodayAllocation.useMutation({ onSuccess: () => { utils.getIncomeAllocationSummary.invalidate(); utils.getIncomeAllocationDays.invalidate(); utils.getCurrentAllocationBalances.invalidate(); } });

  const activeRule = rulesQ.data?.[0];

  const periods = [
    { key: 'today', label: 'اليوم' }, { key: 'week', label: 'هذا الأسبوع' }, { key: 'month', label: 'هذا الشهر' },
    { key: 'year', label: 'هذه السنة' }, { key: 'all', label: 'الكل' }, { key: 'custom', label: 'فترة مخصصة' },
  ];

  if (rulesQ.isLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#f59e0b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 18, animation: 'pulse 2s infinite' }}>جاري التحميل...</p>
      </div>
    </div>
  );

  if (!isInit) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', maxWidth: 500, padding: 40 }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>📊</div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>نظام توزيع الدخل</h1>
        <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 32, lineHeight: 1.7 }}>لم يتم تفعيل نظام توزيع الدخل بعد. ابدأ بتحديد النسب الافتراضية وتاريخ التفعيل.</p>
        <button onClick={() => setShowInitModal(true)} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          🚀 بدء نظام توزيع الدخل
        </button>
      </div>
      {showInitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f2444', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, width: 480, maxWidth: '90vw' }}>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginBottom: 24 }}>تفعيل نظام توزيع الدخل</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {(['purchasePct', 'maintenancePct', 'laborPct', 'capitalPct'] as const).map((k, i) => (
                <div key={k}>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>{['التطوير والمشتريات','الصيانة','العمال','رأس المال'][i]} %</label>
                  <input type="number" value={initForm[k]} onChange={e => setInitForm(f => ({...f, [k]: +e.target.value}))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: Math.abs((initForm.purchasePct+initForm.maintenancePct+initForm.laborPct+initForm.capitalPct)-100) < 0.01 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: Math.abs((initForm.purchasePct+initForm.maintenancePct+initForm.laborPct+initForm.capitalPct)-100) < 0.01 ? '#10b981' : '#ef4444', fontSize: 13 }}>
              المجموع: {initForm.purchasePct+initForm.maintenancePct+initForm.laborPct+initForm.capitalPct}%
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>تاريخ التفعيل</label>
              <input type="date" value={initForm.effectiveFrom} onChange={e => setInitForm(f => ({...f, effectiveFrom: e.target.value}))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>ملاحظة: لن يتم احتساب أي بيانات تاريخية قبل تاريخ التفعيل.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowInitModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 0', color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
              <button onClick={() => initMut.mutate(initForm)} disabled={initMut.isPending || Math.abs((initForm.purchasePct+initForm.maintenancePct+initForm.laborPct+initForm.capitalPct)-100) > 0.01} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, padding: '10px 0', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: initMut.isPending ? 0.7 : 1 }}>
                {initMut.isPending ? 'جاري التفعيل...' : 'تفعيل'}
              </button>
            </div>
            {initMut.error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{initMut.error.message}</p>}
          </div>
        </div>
      )}
    </div>
  );

  const summary = summaryQ.data;
  const balances = balancesQ.data;

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 20px', paddingBottom: 60 }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .tab-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .action-btn:hover { opacity: 0.85 !important; transform: translateY(-1px); }
        .day-row:hover { background: rgba(255,255,255,0.03) !important; }
        .ledger-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>توزيع الدخل</span>
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>متابعة توزيع دخل DEVITE والمبالغ المخصصة والمصروفات والأرصدة المتراكمة</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="action-btn" onClick={() => ensureTodayMut.mutate()} disabled={ensureTodayMut.isPending} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', color: '#9ca3af', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}>
              <RefreshCw size={14} style={{ animation: ensureTodayMut.isPending ? 'spin 1s linear infinite' : 'none' }} />
              تحديث اليوم
            </button>
            <button className="action-btn" onClick={() => setShowAdjModal(true)} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, padding: '8px 16px', color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}>
              <Plus size={14} /> تعديل يدوي
            </button>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {periods.map(p => (
          <button key={p.key} className="tab-btn" onClick={() => setPeriod(p.key)} style={{ background: period === p.key ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (period === p.key ? 'transparent' : 'rgba(255,255,255,0.08)'), borderRadius: 8, padding: '7px 14px', color: period === p.key ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: 13, fontWeight: period === p.key ? 700 : 400, transition: 'all 0.2s', fontFamily: 'inherit' }}>{p.label}</button>
        ))}
      </div>
      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div><label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>من</label><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit' }} /></div>
          <div><label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>إلى</label><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit' }} /></div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {([['overview','نظرة عامة',BarChart3],['ledger','سجل الحركات',List],['settings','الإعدادات',Settings]] as any).map(([key,label,Icon]: any) => (
          <button key={key} className="tab-btn" onClick={() => setActiveTab(key)} style={{ background: 'none', border: 'none', borderBottom: activeTab === key ? '2px solid #f59e0b' : '2px solid transparent', padding: '10px 20px', color: activeTab === key ? '#f59e0b' : '#6b7280', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === key ? 700 : 400, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary Bar */}
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {summaryQ.isLoading ? <p style={{ color: '#f59e0b', gridColumn: '1/-1' }}>جاري التحميل...</p> : summary ? (
              <>
                <div><p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>إجمالي دخل الفترة</p><p style={{ color: '#f59e0b', fontSize: 22, fontWeight: 900, margin: 0 }}>{fmt(summary.totalIncome)}</p></div>
                <div><p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>رصيد التطوير</p><p style={{ color: summary.closingBalances.purchase < 0 ? '#ef4444' : '#3b82f6', fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(summary.closingBalances.purchase)}</p></div>
                <div><p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>رصيد الصيانة</p><p style={{ color: summary.closingBalances.maintenance < 0 ? '#ef4444' : '#f59e0b', fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(summary.closingBalances.maintenance)}</p></div>
                <div><p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>رصيد العمال</p><p style={{ color: summary.closingBalances.labor < 0 ? '#ef4444' : '#10b981', fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(summary.closingBalances.labor)}</p></div>
                <div><p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>رصيد رأس المال</p><p style={{ color: summary.closingBalances.capital < 0 ? '#ef4444' : '#a855f7', fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(summary.closingBalances.capital)}</p></div>
              </>
            ) : <p style={{ color: '#6b7280', gridColumn: '1/-1' }}>لا توجد بيانات للفترة المحددة</p>}
          </div>

          {/* Bucket Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
            {BUCKETS.map(bucket => {
              const bs = summary?.buckets[bucket.key];
              const closing = summary?.closingBalances[bucket.key === 'PURCHASE_DEVELOPMENT' ? 'purchase' : bucket.key === 'MAINTENANCE' ? 'maintenance' : bucket.key === 'LABOR' ? 'labor' : 'capital'] ?? 0;
              const opening = summary?.openingBalances[bucket.key === 'PURCHASE_DEVELOPMENT' ? 'purchase' : bucket.key === 'MAINTENANCE' ? 'maintenance' : bucket.key === 'LABOR' ? 'labor' : 'capital'] ?? 0;
              const pct = activeRule ? (activeRule as any)[bucket.key === 'PURCHASE_DEVELOPMENT' ? 'purchasePct' : bucket.key === 'MAINTENANCE' ? 'maintenancePct' : bucket.key === 'LABOR' ? 'laborPct' : 'capitalPct'] : 0;
              const isNeg = closing < 0;
              return (
                <div key={bucket.key} style={{ background: bucket.bg, border: `1px solid ${isNeg ? 'rgba(239,68,68,0.4)' : bucket.border}`, borderRadius: 20, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{bucket.icon}</span>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: 15 }}>{bucket.label}</p>
                        <p style={{ color: bucket.color, fontSize: 12, margin: 0 }}>{pct}% من الدخل</p>
                      </div>
                    </div>
                    {isNeg && <AlertTriangle size={18} color="#ef4444" />}
                  </div>
                  {bs ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 14px' }}><p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 3px' }}>الرصيد الافتتاحي</p><p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600, margin: 0 }}>{fmt(opening)}</p></div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 14px' }}><p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 3px' }}>المخصص</p><p style={{ color: bucket.color, fontSize: 14, fontWeight: 600, margin: 0 }}>+{fmt(bs.allocated)}</p></div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 14px' }}><p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 3px' }}>المصروف</p><p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>-{fmt(bs.spent)}</p></div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 14px' }}><p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 3px' }}>التعديلات</p><p style={{ color: bs.adjustments >= 0 ? '#10b981' : '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>{bs.adjustments >= 0 ? '+' : ''}{fmt(bs.adjustments)}</p></div>
                      </div>
                      <div style={{ borderTop: `1px solid ${bucket.border}`, paddingTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#9ca3af', fontSize: 13 }}>الرصيد المتاح</span>
                          <span style={{ color: isNeg ? '#ef4444' : '#fff', fontSize: 20, fontWeight: 900 }}>{fmt(closing)}</span>
                        </div>
                        {isNeg && <p style={{ color: '#ef4444', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>⚠️ الرصيد أقل من المصروفات بمقدار {fmt(Math.abs(closing))}</p>}
                      </div>
                    </>
                  ) : <p style={{ color: '#6b7280', fontSize: 13 }}>لا توجد بيانات</p>}
                </div>
              );
            })}
          </div>

          {/* Daily Log */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: 16 }}>📅 السجل اليومي</h3>
              <span style={{ color: '#6b7280', fontSize: 12 }}>{daysQ.data?.total || 0} يوم</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['التاريخ','الدخل','تطوير','صيانة','عمال','رأس مال','الحالة',''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', color: '#6b7280', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysQ.isLoading ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</td></tr>
                  : daysQ.data?.data.length === 0 ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>لا توجد أيام مسجلة في هذه الفترة</td></tr>
                  : daysQ.data?.data.map((day: any) => (
                    <tr key={day.id} className="day-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'pointer' }} onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}>
                      <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(day.businessDate).toLocaleDateString('ar-BH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 700 }}>{fmt(day.grossEligibleIncome)}</td>
                      <td style={{ padding: '12px 16px', color: day.purchaseClosingBal < 0 ? '#ef4444' : '#3b82f6' }}>{fmt(day.purchaseClosingBal)}</td>
                      <td style={{ padding: '12px 16px', color: day.maintenanceClosingBal < 0 ? '#ef4444' : '#f59e0b' }}>{fmt(day.maintenanceClosingBal)}</td>
                      <td style={{ padding: '12px 16px', color: day.laborClosingBal < 0 ? '#ef4444' : '#10b981' }}>{fmt(day.laborClosingBal)}</td>
                      <td style={{ padding: '12px 16px', color: day.capitalClosingBal < 0 ? '#ef4444' : '#a855f7' }}>{fmt(day.capitalClosingBal)}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ background: day.status === 'OPEN' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: day.status === 'OPEN' ? '#10b981' : '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{day.status === 'OPEN' ? 'مفتوح' : 'مغلق'}</span></td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{expandedDay === day.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={ledgerBucket} onChange={e => { setLedgerBucket(e.target.value); setLedgerPage(1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}>
              <option value="">كل الأقسام</option>
              {BUCKETS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
            <select value={ledgerType} onChange={e => { setLedgerType(e.target.value); setLedgerPage(1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}>
              <option value="">كل الأنواع</option>
              {Object.entries(TX_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['التاريخ/الوقت','القسم','النوع','الوصف','داخل','خارج','الرصيد بعد'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', color: '#6b7280', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerQ.isLoading ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</td></tr>
                  : ledgerQ.data?.data.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>لا توجد حركات</td></tr>
                  : ledgerQ.data?.data.map((tx: any) => {
                    const bkt = BUCKETS.find(b => b.key === tx.bucket);
                    return (
                      <tr key={tx.id} className="ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '10px 16px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(tx.createdAt).toLocaleString('ar-BH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '10px 16px' }}><span style={{ color: bkt?.color, fontSize: 12 }}>{bkt?.icon} {bkt?.label}</span></td>
                        <td style={{ padding: '10px 16px' }}><span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12, color: '#9ca3af', fontSize: 11 }}>{TX_TYPE_LABELS[tx.transactionType] || tx.transactionType}</span></td>
                        <td style={{ padding: '10px 16px', color: '#d1d5db', maxWidth: 200 }}>{tx.description}</td>
                        <td style={{ padding: '10px 16px', color: '#10b981', fontWeight: 600 }}>{tx.direction === 'CREDIT' ? fmt(tx.amount) : '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#ef4444', fontWeight: 600 }}>{tx.direction === 'DEBIT' ? fmt(tx.amount) : '—'}</td>
                        <td style={{ padding: '10px 16px', color: tx.balanceAfter < 0 ? '#ef4444' : '#fff', fontWeight: 700 }}>{fmt(tx.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ledgerQ.data && ledgerQ.data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
                {Array.from({ length: ledgerQ.data.totalPages }, (_, i) => (
                  <button key={i} onClick={() => setLedgerPage(i+1)} style={{ background: ledgerPage === i+1 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 12px', color: ledgerPage === i+1 ? '#000' : '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}>{i+1}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 540 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 28 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginTop: 0, marginBottom: 8 }}>إعدادات توزيع الدخل</h3>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>النسب الحالية — ستُطبَّق على الأيام الجديدة فقط. الأيام السابقة لن تتغير.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {BUCKETS.map(b => {
                const k = b.key === 'PURCHASE_DEVELOPMENT' ? 'purchasePct' : b.key === 'MAINTENANCE' ? 'maintenancePct' : b.key === 'LABOR' ? 'laborPct' : 'capitalPct';
                return (
                  <div key={b.key}>
                    <label style={{ color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><span>{b.icon}</span>{b.label} %</label>
                    <input type="number" min={0} max={100} step={0.5} value={(settingsForm as any)[k]} onChange={e => setSettingsForm(f => ({ ...f, [k]: +e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${b.border}`, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 16, fontWeight: 700, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) < 0.01 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) < 0.01 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), color: Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) < 0.01 ? '#10b981' : '#ef4444', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) < 0.01 ? <Check size={16}/> : <X size={16}/>}
              المجموع: {(settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct).toFixed(1)}%
              {Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) >= 0.01 && ' — يجب أن يكون 100%'}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>ملاحظات (اختياري)</label>
              <input value={settingsForm.notes} onChange={e => setSettingsForm(f => ({ ...f, notes: e.target.value }))} placeholder="سبب التغيير..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <button onClick={() => { if (confirm('سيتم تطبيق النسب الجديدة على الأيام الجديدة فقط. هل تريد المتابعة؟')) updateRulesMut.mutate(settingsForm); }} disabled={updateRulesMut.isPending || Math.abs((settingsForm.purchasePct+settingsForm.maintenancePct+settingsForm.laborPct+settingsForm.capitalPct)-100) > 0.01} style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 12, padding: '12px 0', color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: updateRulesMut.isPending ? 0.7 : 1 }}>
              {updateRulesMut.isPending ? 'جاري الحفظ...' : 'حفظ النسب الجديدة'}
            </button>
            {updateRulesMut.error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{updateRulesMut.error.message}</p>}
          </div>

          {/* Rule History */}
          {rulesQ.data && rulesQ.data.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, marginTop: 20 }}>
              <h4 style={{ color: '#fff', margin: '0 0 16px' }}>تاريخ تغييرات النسب</h4>
              {rulesQ.data.map((rule: any) => (
                <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{rule.purchasePct}/{rule.maintenancePct}/{rule.laborPct}/{rule.capitalPct}%</span>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{new Date(rule.effectiveFrom).toLocaleDateString('ar-BH')}{rule.effectiveTo ? ' ← ' + new Date(rule.effectiveTo).toLocaleDateString('ar-BH') : ' ← الآن'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {showAdjModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f2444', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, width: 480, maxWidth: '90vw', direction: 'rtl' }}>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginBottom: 24 }}>تعديل يدوي</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>القسم</label>
              <select value={adjForm.bucket} onChange={e => setAdjForm(f => ({...f, bucket: e.target.value}))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'inherit' }}>
                {BUCKETS.map(b => <option key={b.key} value={b.key}>{b.icon} {b.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setAdjForm(f => ({...f, direction: 'CREDIT'}))} style={{ padding: '10px', borderRadius: 10, border: '2px solid ' + (adjForm.direction === 'CREDIT' ? '#10b981' : 'rgba(255,255,255,0.1)'), background: adjForm.direction === 'CREDIT' ? 'rgba(16,185,129,0.1)' : 'transparent', color: adjForm.direction === 'CREDIT' ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>+ إضافة</button>
              <button onClick={() => setAdjForm(f => ({...f, direction: 'DEBIT'}))} style={{ padding: '10px', borderRadius: 10, border: '2px solid ' + (adjForm.direction === 'DEBIT' ? '#ef4444' : 'rgba(255,255,255,0.1)'), background: adjForm.direction === 'DEBIT' ? 'rgba(239,68,68,0.1)' : 'transparent', color: adjForm.direction === 'DEBIT' ? '#ef4444' : '#6b7280', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>- خصم</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>المبلغ (د.ب)</label>
              <input type="number" min={0.001} step={0.001} value={adjForm.amount} onChange={e => setAdjForm(f => ({...f, amount: e.target.value}))} placeholder="0.000" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>السبب *</label>
              <input value={adjForm.reason} onChange={e => setAdjForm(f => ({...f, reason: e.target.value}))} placeholder="سبب التعديل..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>ملاحظات (اختياري)</label>
              <input value={adjForm.note} onChange={e => setAdjForm(f => ({...f, note: e.target.value}))} placeholder="ملاحظات إضافية..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowAdjModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 0', color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
              <button onClick={() => adjMut.mutate({ bucket: adjForm.bucket as any, direction: adjForm.direction as any, amount: parseFloat(adjForm.amount), reason: adjForm.reason, note: adjForm.note, businessDate: new Date().toISOString().slice(0,10) })} disabled={adjMut.isPending || !adjForm.reason || !adjForm.amount} style={{ flex: 2, background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: adjMut.isPending ? 0.7 : 1 }}>
                {adjMut.isPending ? 'جاري الحفظ...' : 'تأكيد التعديل'}
              </button>
            </div>
            {adjMut.error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{adjMut.error.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
