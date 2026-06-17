'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type ExpenseCategory =
  | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing'
  | 'Supplies' | 'Food & Beverage' | 'Transport' | 'Other';

type ExpenseEntry = {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Cheque';
  receiptRef: string;
  notes: string;
};

// ── Category mapping (frontend ↔ backend) ─────────────────────────────────────
const CATEGORIES: { label: ExpenseCategory; icon: string; color: string; backend: string }[] = [
  { label: 'Utilities',       icon: '💡', color: '#FBBF24',        backend: 'electricity' },
  { label: 'Rent',            icon: '🏢', color: '#60A5FA',        backend: 'rent' },
  { label: 'Salaries',        icon: '👥', color: '#A78BFA',        backend: 'salary' },
  { label: 'Maintenance',     icon: '🔧', color: '#FF8C42',        backend: 'maintenance' },
  { label: 'Marketing',       icon: '📣', color: '#E13737',        backend: 'marketing' },
  { label: 'Supplies',        icon: '📦', color: '#22C55E',        backend: 'supplies' },
  { label: 'Food & Beverage', icon: '🍽️', color: 'var(--primary)', backend: 'food_beverage' },
  { label: 'Transport',       icon: '🚗', color: '#06B6D4',        backend: 'transport' },
  { label: 'Other',           icon: '📋', color: '#888880',        backend: 'other' },
];

const BACKEND_TO_LABEL: Record<string, ExpenseCategory> = {
  electricity: 'Utilities', water: 'Utilities', rent: 'Rent', salary: 'Salaries',
  maintenance: 'Maintenance', marketing: 'Marketing', supplies: 'Supplies',
  food_beverage: 'Food & Beverage', transport: 'Transport', other: 'Other',
};

const PAYMENT_METHODS = ['Cash', 'Card', 'Transfer', 'Cheque'] as const;
const PM_TO_BACKEND: Record<string, string> = { Cash: 'cash', Card: 'card', Transfer: 'transfer', Cheque: 'cheque' };
const PM_FROM_BACKEND: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Transfer', cheque: 'Cheque' };

function mapFromBackend(r: Record<string, any>): ExpenseEntry {
  return {
    id: r._id,
    date: (r.createdAt as string).split('T')[0],
    category: BACKEND_TO_LABEL[r.expenseCategory] ?? 'Other',
    description: r.expenseDescription ?? '',
    amount: r.expenseAmount ?? 0,
    paymentMethod: (PM_FROM_BACKEND[r.paymentMethod] ?? 'Cash') as ExpenseEntry['paymentMethod'],
    receiptRef: r.receiptRef ?? '',
    notes: r.notes ?? '',
  };
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.08em',
  fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 5,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--input-bg)',
  border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)',
  fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
const onFocusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-border)');
const onBlurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)');

// ── Expense Form ──────────────────────────────────────────────────────────────
function ExpenseForm({ onAdd }: { onAdd: (e: ExpenseEntry) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Omit<ExpenseEntry, 'id'>>({
    date: today, category: 'Other', description: '', amount: 0,
    paymentMethod: 'Cash', receiptRef: '', notes: '',
  });
  const [amtStr, setAmtStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const canSave = form.description.trim() && parseFloat(amtStr) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setErr('');
    try {
      const cat = CATEGORIES.find(c => c.label === form.category);
      const res = await api.post('/procurement/expense', {
        expenseCategory:    cat?.backend ?? 'other',
        expenseDescription: form.description,
        expenseAmount:      parseFloat(amtStr),
        paymentMethod:      PM_TO_BACKEND[form.paymentMethod] ?? 'cash',
        receiptRef:         form.receiptRef,
        notes:              form.notes,
      });
      onAdd(mapFromBackend(res.data.data));
      setSaved(true);
      message.success('Expense saved successfully');
      setAmtStr('');
      setForm({ date: today, category: 'Other', description: '', amount: 0, paymentMethod: 'Cash', receiptRef: '', notes: '' });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      const errMsg = e?.response?.data?.message ?? 'Failed to save expense';
      setErr(errMsg);
      message.error(errMsg);
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', margin: 0 }}>NEW EXPENSE</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelSt}>DATE</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputSt} onFocus={onFocusBorder} onBlur={onBlurBorder} />
        </div>
        <div>
          <label style={labelSt}>CATEGORY</label>
          <select value={form.category} onChange={e => set('category', e.target.value as ExpenseCategory)} style={inputSt} onFocus={onFocusBorder} onBlur={onBlurBorder}>
            {CATEGORIES.map(c => <option key={c.label} value={c.label} style={{ background: 'var(--modal-bg)' }}>{c.icon} {c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelSt}>DESCRIPTION *</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Electricity bill – May" style={inputSt} onFocus={onFocusBorder} onBlur={onBlurBorder} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelSt}>AMOUNT (SR) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'Syne,sans-serif', pointerEvents: 'none' }}>SR</span>
            <input type="number" min="0" step="0.01" value={amtStr} onChange={e => setAmtStr(e.target.value)} placeholder="0.00" style={{ ...inputSt, paddingLeft: 30 }} onFocus={onFocusBorder} onBlur={onBlurBorder} />
          </div>
        </div>
        <div>
          <label style={labelSt}>PAYMENT METHOD</label>
          <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value as typeof form.paymentMethod)} style={inputSt} onFocus={onFocusBorder} onBlur={onBlurBorder}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m} style={{ background: 'var(--modal-bg)' }}>{m}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelSt}>RECEIPT / REF # (optional)</label>
        <input value={form.receiptRef} onChange={e => set('receiptRef', e.target.value)} placeholder="e.g. INV-001" style={inputSt} onFocus={onFocusBorder} onBlur={onBlurBorder} />
      </div>

      <div>
        <label style={labelSt}>NOTES (optional)</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional details…" rows={2} style={{ ...inputSt, resize: 'vertical' }} onFocus={onFocusBorder} onBlur={onBlurBorder} />
      </div>

      {err && <p style={{ fontSize: 14, color: '#FF6B6B', margin: 0 }}>{err}</p>}

      <button onClick={handleSave} disabled={!canSave || saving}
        style={{ padding: '12px', borderRadius: 11, border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          background: saved ? 'rgba(34,197,94,0.15)' : canSave && !saving ? 'linear-gradient(135deg,var(--primary),var(--primary-dim))' : 'var(--input-bg)',
          color: saved ? '#22C55E' : canSave && !saving ? 'white' : 'var(--text-dim)',
          outline: saved ? '1px solid rgba(34,197,94,0.35)' : 'none',
          boxShadow: canSave && !saving && !saved ? '0 4px 18px rgba(232,68,58,0.35)' : 'none',
        }}>
        {saving ? 'Saving…' : saved ? '✓ EXPENSE SAVED!' : '+ ADD EXPENSE'}
      </button>
    </div>
  );
}

// ── Expense Row ───────────────────────────────────────────────────────────────
function ExpenseRow({ entry, onDelete }: { entry: ExpenseEntry; onDelete: () => void }) {
  const cat = CATEGORIES.find(c => c.label === entry.category);
  const pmColor: Record<string, string> = { Cash: '#22C55E', Card: '#60A5FA', Transfer: '#A78BFA', Cheque: '#FBBF24' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 120px 1fr 90px 90px 32px', gap: 10, alignItems: 'center', padding: '10px 16px', background: 'var(--card-bg)', borderRadius: 11, border: '1px solid var(--border)', marginBottom: 6 }}>
      <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{entry.date}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{cat?.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: cat?.color || 'var(--text-muted)' }}>{entry.category}</span>
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{entry.description}</p>
        {entry.notes && <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '2px 0 0' }}>{entry.notes}</p>}
        {entry.receiptRef && <p style={{ fontSize: 14, color: 'var(--primary)', margin: '2px 0 0', fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>Ref: {entry.receiptRef}</p>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', textAlign: 'right' }}>SR {entry.amount.toFixed(2)}</span>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: pmColor[entry.paymentMethod] || 'var(--text-muted)', background: `${pmColor[entry.paymentMethod] || '#888'}18`, padding: '2px 8px', borderRadius: 20, fontFamily: 'Syne,sans-serif' }}>
          {entry.paymentMethod}
        </span>
      </div>
      <button onClick={onDelete}
        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.15)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.06)')}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#FF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Page() {
  const [expenses,   setExpenses]   = useState<ExpenseEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState('');
  const [catFilter,  setCatFilter]  = useState<ExpenseCategory | 'all'>('all');
  const [pmFilter,   setPmFilter]   = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setFetchErr('');
    try {
      const res = await api.get('/procurement?type=expense&all=1');
      const raw: Record<string, any>[] = res.data.data ?? [];
      setExpenses(raw.map(mapFromBackend));
    } catch (e: any) {
      setFetchErr(e?.response?.data?.message ?? 'Failed to load expenses. Is the backend running?');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addExpense = (e: ExpenseEntry) => setExpenses(prev => [e, ...prev]);

  const delExpense = async (id: string) => {
    try {
      await api.delete(`/procurement/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
      message.success('Expense deleted');
    } catch {
      message.error('Failed to delete expense');
    }
  };

  const filtered = useMemo(() => expenses.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    if (pmFilter  !== 'all' && e.paymentMethod !== pmFilter)  return false;
    if (searchText && !e.description.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo   && e.date > dateTo)   return false;
    return true;
  }), [expenses, catFilter, pmFilter, searchText, dateFrom, dateTo]);

  const totalShown = filtered.reduce((s, e) => s + e.amount, 0);
  const totalAll   = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach(e => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── LEFT: form + breakdown ── */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💰</div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>Expenses</h2>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>OPERATIONAL COST TRACKER</p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <ExpenseForm onAdd={addExpense} />
          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', marginBottom: 12 }}>BREAKDOWN — ALL TIME</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byCategory.map(([cat, amt]) => {
              const cfg = CATEGORIES.find(c => c.label === cat);
              const pct = totalAll > 0 ? (amt / totalAll * 100) : 0;
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}><span>{cfg?.icon}</span>{cat}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: cfg?.color || 'var(--text)' }}>SR {amt.toFixed(0)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: cfg?.color || 'var(--primary)', width: `${pct}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>Total Expenses</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#FBBF24', fontFamily: 'Syne,sans-serif' }}>SR {totalAll.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="var(--text-dim)" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" /></svg>
            </span>
            <input placeholder="Search expenses…" value={searchText} onChange={e => setSearchText(e.target.value)} style={{ ...inputSt, paddingLeft: 28, width: '100%' }} onFocus={onFocusBorder} onBlur={onBlurBorder} />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value as typeof catFilter)} style={{ ...inputSt, width: 'auto', minWidth: 130 }} onFocus={onFocusBorder} onBlur={onBlurBorder}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.label} value={c.label} style={{ background: 'var(--modal-bg)' }}>{c.icon} {c.label}</option>)}
          </select>
          <select value={pmFilter} onChange={e => setPmFilter(e.target.value)} style={{ ...inputSt, width: 'auto', minWidth: 110 }} onFocus={onFocusBorder} onBlur={onBlurBorder}>
            <option value="all">All Methods</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m} style={{ background: 'var(--modal-bg)' }}>{m}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputSt, width: 130 }} onFocus={onFocusBorder} onBlur={onBlurBorder} />
            <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputSt, width: 130 }} onFocus={onFocusBorder} onBlur={onBlurBorder} />
          </div>
          {(catFilter !== 'all' || pmFilter !== 'all' || searchText || dateFrom || dateTo) && (
            <button onClick={() => { setCatFilter('all'); setPmFilter('all'); setSearchText(''); setDateFrom(''); setDateTo(''); }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif', whiteSpace: 'nowrap' }}>
              Clear ×
            </button>
          )}
        </div>

        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '90px 120px 1fr 90px 90px 32px', gap: 10, flexShrink: 0 }}>
          {['DATE', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'METHOD', ''].map(h => (
            <span key={h} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif' }}>{h}</span>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, opacity: 0.4 }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', fontFamily: 'Syne,sans-serif' }}>Loading expenses…</p>
            </div>
          ) : fetchErr ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <p style={{ fontSize: 14, color: '#FF4444', fontFamily: 'Syne,sans-serif', textAlign: 'center' }}>{fetchErr}</p>
              <button onClick={load} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14 }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, opacity: 0.35 }}>
              <span style={{ fontSize: 36 }}>💸</span>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', fontFamily: 'Syne,sans-serif' }}>No expenses found</p>
            </div>
          ) : (
            filtered.map(e => <ExpenseRow key={e.id} entry={e} onDelete={() => delExpense(e.id)} />)
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''} shown</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {filtered.length !== expenses.length && (
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Filtered: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>SR {totalShown.toFixed(2)}</span></span>
            )}
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: '7px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Syne,sans-serif' }}>TOTAL</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#FBBF24', fontFamily: 'Syne,sans-serif' }}>SR {totalShown.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
