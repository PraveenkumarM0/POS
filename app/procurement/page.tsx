'use client';
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '@/lib/api';
// import '../purchase/procurement/procurement.css';

// ── Types ─────────────────────────────────────────────────────────────────────
type ProcUnit = 'kg' | 'g' | 'l' | 'ml' | 'pieces' | 'dozen' | 'box' | 'bag';

interface InvItem {
  _id: string;
  name: string;
}

interface OrderLine {
  invId: string;        // inventory item _id (or '' for manual lines)
  name: string;
  qty: string;
  unit: ProcUnit;
  pricePerUnit: string; // only used for manual
}

interface ProcRecord {
  _id: string;
  referenceId: string;
  type: 'request' | 'manual';
  status: 'pending' | 'received' | 'cancelled';
  items: { name: string; unit: string; quantity: number; pricePerUnit: number }[];
  totalAmount: number;
  notes: string;
  createdAt: string;
}

interface ExpenseRecord {
  _id: string;
  name: string;
  amount: number;
  createdAt: string;
}

const UNITS: ProcUnit[] = ['pieces', 'kg', 'g', 'l', 'ml', 'dozen', 'box', 'bag'];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',  color: '#FBBF24' },
  received:  { label: 'Received', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#EF4444' },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--card-bg)', borderRadius: 20,
  border: '1px solid var(--border)', padding: 20,
  height: 'calc(100vh - 120px)', display: 'flex',
  flexDirection: 'column', overflow: 'hidden',
};
const inputSt: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--input-bg)', color: 'var(--text)', fontSize: 15,
  outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#ef4444,#dc2626)', height: 50,
  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
  fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em',
};
const btnOutline: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10,
  border: '1.5px solid var(--primary)', background: 'transparent',
  color: 'var(--primary)', fontWeight: 700, fontSize: 15,
  cursor: 'pointer', fontFamily: 'Syne,sans-serif',
};

// ── Request Modal ─────────────────────────────────────────────────────────────
function RequestModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [invItems, setInvItems]     = useState<InvItem[]>([]);
  const [orderList, setOrderList]   = useState<OrderLine[]>([]);
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [loadingInv, setLoadingInv] = useState(true);

  useEffect(() => {
    api.get('/procurement/inventory-items').then(r => {
      setInvItems(r.data.data ?? []);
      setLoadingInv(false);
    }).catch(() => setLoadingInv(false));
  }, []);

  const addToOrder = (item: InvItem) => {
    if (orderList.find(l => l.invId === item._id)) return;
    setOrderList(p => [...p, { invId: item._id, name: item.name, qty: '', unit: 'pieces', pricePerUnit: '' }]);
  };

  const removeInvItem = async (id: string) => {
    try {
      await api.delete(`/procurement/inventory-items/${id}`);
      setInvItems(p => p.filter(i => i._id !== id));
      setOrderList(p => p.filter(l => l.invId !== id));
    } catch { /* ignore */ }
  };

  const addNewInvItem = async () => {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    try {
      const r = await api.post('/procurement/inventory-items', { name: newItemName.trim() });
      setInvItems(p => [...p, r.data.data]);
      setNewItemName('');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to add item');
    }
    setAddingItem(false);
  };

  const submit = async () => {
    const validLines = orderList.filter(l => l.name && parseFloat(l.qty) > 0);
    if (validLines.length === 0) { setErr('Add at least one item with a valid quantity'); return; }
    setSaving(true); setErr('');
    try {
      await api.post('/procurement/request', {
        items: validLines.map(l => ({ name: l.name, unit: l.unit, quantity: parseFloat(l.qty) })),
        notes,
      });
      message.success('Request submitted successfully');
      onDone();
    } catch (e: any) {
      const errMsg = e?.response?.data?.message ?? 'Failed to submit request';
      setErr(errMsg);
      message.error(errMsg);
    }
    setSaving(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ width:'80%', maxWidth:860, background:'var(--card-bg)', borderRadius:18, padding:24, border:'1px solid var(--border)', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexShrink:0 }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>REQUEST FROM INVENTORY </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text)', cursor:'pointer', fontSize:30 }}>X</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, flex:1, overflow:'hidden' }}>
          {/* Left: Inventory */}
          <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', gap:8, marginBottom:12, flexShrink:0 }}>
              <input placeholder="New inventory item…" value={newItemName} onChange={e => setNewItemName(e.target.value)}
                style={{ ...inputSt }} onKeyDown={e => e.key === 'Enter' && addNewInvItem()} />
              <button onClick={addNewInvItem} disabled={addingItem || !newItemName.trim()} style={{ ...btnPrimary, whiteSpace:'nowrap' }}>
                {addingItem ? '…' : '+ Add'}
              </button>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', margin:'0 0 8px', flexShrink:0 }}>INVENTORY ITEMS</p>
            <div style={{ flex:1, overflowY:'auto' }}>
              {loadingInv ? (
                <p style={{ fontSize:15, color:'var(--text-dim)', textAlign:'center', padding:20 }}>Loading…</p>
              ) : invItems.length === 0 ? (
                <p style={{ fontSize:15, color:'var(--text-dim)', textAlign:'center', padding:20 }}>No inventory items. Add one above.</p>
              ) : invItems.map(item => (
                <div key={item._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:15, color:'var(--text)' }}>{item.name}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => addToOrder(item)} style={{ width:40, height:40, borderRadius:7, border:'none', background:'var(--primary)', color:'#fff', cursor:'pointer', fontWeight:800, fontSize:16 }}>+</button>
                    <button onClick={() => removeInvItem(item._id)} style={{ width:40, height:40, borderRadius:7, border:'none', background:'rgba(239,68,68,0.12)', color:'#ef4444', cursor:'pointer', fontWeight:800 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Order list */}
          <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', margin:'0 0 10px', flexShrink:0 }}>ORDER LIST</p>
            <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
              {orderList.length === 0 ? (
                <p style={{ fontSize:15, color:'var(--text-dim)', textAlign:'center', padding:20 }}>Click + on an inventory item to add it here.</p>
              ) : orderList.map(line => (
                <div key={line.invId} style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px', gap:8, marginBottom:8, alignItems:'center' }}>
                  <span style={{ fontSize:15, fontWeight:600, color:'var(--text)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{line.name}</span>
                  <input type="number" placeholder="Qty" value={line.qty} min="0.01" step="0.01"
                    onChange={e => setOrderList(p => p.map(l => l.invId === line.invId ? { ...l, qty: e.target.value } : l))}
                    style={{ ...inputSt }} />
                  <select value={line.unit} style={{ ...inputSt }}
                    onChange={e => setOrderList(p => p.map(l => l.invId === line.invId ? { ...l, unit: e.target.value as ProcUnit } : l))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...inputSt, resize:'vertical', marginBottom:10, flexShrink:0 }} />
            {err && <p style={{ fontSize:15, color:'#EF4444', marginBottom:8 }}>{err}</p>}
            <button onClick={submit} disabled={saving} style={{ ...btnPrimary, width:'100%', padding:11 }}>
              {saving ? 'Submitting…' : 'SUBMIT REQUEST'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manual Modal ──────────────────────────────────────────────────────────────
function ManualModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [lines, setLines] = useState<Omit<OrderLine, 'invId'>[]>([{ name:'', qty:'', unit:'pieces', pricePerUnit:'' }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addLine = () => setLines(p => [...p, { name:'', qty:'', unit:'pieces', pricePerUnit:'' }]);
  const removeLine = (idx: number) => setLines(p => p.filter((_, i) => i !== idx));

  const submit = async () => {
    const valid = lines.filter(l => l.name.trim() && parseFloat(l.qty) > 0);
    if (valid.length === 0) { setErr('Add at least one item with a name and quantity'); return; }
    setSaving(true); setErr('');
    try {
      await api.post('/procurement/manual', {
        items: valid.map(l => ({
          name: l.name.trim(),
          unit: l.unit,
          quantity: parseFloat(l.qty),
          pricePerUnit: parseFloat(l.pricePerUnit) || 0,
        })),
        notes,
      });
      message.success('Purchase saved successfully');
      onDone();
    } catch (e: any) {
      const errMsg = e?.response?.data?.message ?? 'Failed to save';
      setErr(errMsg);
      message.error(errMsg);
    }
    setSaving(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ width:'50%', minWidth:460, background:'var(--card-bg)', borderRadius:18, padding:24, border:'1px solid var(--border)', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexShrink:0 }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>IN STORE PURCHASE</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 70px 80px 28px', gap:8, marginBottom:6 }}>
            {['ITEM', 'PRICE/UNIT', 'QTY', 'UNIT', ''].map(h => (
              <span key={h} style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.08em', fontFamily:'Syne,sans-serif' }}>{h}</span>
            ))}
          </div>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 80px 70px 80px 28px', gap:8, marginBottom:8, alignItems:'center' }}>
              <input placeholder="Item name" value={line.name} style={{ ...inputSt }}
                onChange={e => setLines(p => p.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))} />
              <input type="number" placeholder="0.00" value={line.pricePerUnit} min="0" step="0.01" style={{ ...inputSt }}
                onChange={e => setLines(p => p.map((l, i) => i === idx ? { ...l, pricePerUnit: e.target.value } : l))} />
              <input type="number" placeholder="Qty" value={line.qty} min="0.01" step="0.01" style={{ ...inputSt }}
                onChange={e => setLines(p => p.map((l, i) => i === idx ? { ...l, qty: e.target.value } : l))} />
              <select value={line.unit} style={{ ...inputSt }}
                onChange={e => setLines(p => p.map((l, i) => i === idx ? { ...l, unit: e.target.value as ProcUnit } : l))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={() => removeLine(idx)} disabled={lines.length === 1}
                style={{ width:28, height:28, borderRadius:7, border:'none', background:'rgba(239,68,68,0.1)', color:'#ef4444', cursor:'pointer', fontSize:15, opacity: lines.length === 1 ? 0.3 : 1 }}>✕</button>
            </div>
          ))}
          <button onClick={addLine} style={{ ...btnOutline, marginTop:4, marginBottom:14 }}>+ ADD LINE</button>

          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inputSt, resize:'vertical', display:'block' }} />
        </div>

        {err && <p style={{ fontSize:15, color:'#EF4444', marginBottom:8 }}>{err}</p>}
        <button onClick={submit} disabled={saving} style={{ ...btnPrimary, width:'100%', padding:11 }}>
          {saving ? 'Saving…' : 'SAVE PURCHASE'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchasePage() {
  const [activeTab, setActiveTab] = useState<'procurement' | 'expense'>('procurement');

  // ── Procurement state ──────────────────────────────────────────────────────
  const [records, setRecords]         = useState<ProcRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [showManual, setShowManual]   = useState(false);
  const [acting, setActing]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.get('/procurement?all=1');
      const raw: any[] = res.data.data ?? [];
      setRecords(raw.filter(r => r.type !== 'expense') as ProcRecord[]);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to load. Is the backend running?');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const receive = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/procurement/${id}/receive`);
      setRecords(p => p.map(r => r._id === id ? { ...r, status: 'received' } : r));
      message.success('Marked as received');
    } catch {
      message.error('Failed to mark as received');
    }
    setActing(null);
  };

  const cancel = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/procurement/${id}/cancel`);
      setRecords(p => p.map(r => r._id === id ? { ...r, status: 'cancelled' } : r));
      message.success('Request cancelled');
    } catch {
      message.error('Failed to cancel request');
    }
    setActing(null);
  };

  // ── Expense state ──────────────────────────────────────────────────────────
  const [expenses, setExpenses]       = useState<ExpenseRecord[]>([]);
  const [expLoading, setExpLoading]   = useState(false);
  const [expName, setExpName]         = useState('');
  const [expAmount, setExpAmount]     = useState('');
  const [expSaving, setExpSaving]     = useState(false);
  const [expErr, setExpErr]           = useState('');
  const [deletingExp, setDeletingExp] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data.data ?? []);
    } catch { /* ignore */ }
    setExpLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'expense') loadExpenses();
  }, [activeTab, loadExpenses]);

  const addExpense = async () => {
    if (!expName.trim() || !expAmount || parseFloat(expAmount) <= 0) {
      setExpErr('Enter a valid name and amount');
      return;
    }
    setExpSaving(true); setExpErr('');
    try {
      const res = await api.post('/expenses', { name: expName.trim(), amount: parseFloat(expAmount) });
      setExpenses(p => [res.data.data, ...p]);
      setExpName(''); setExpAmount('');
      message.success('Expense saved successfully');
    } catch (e: any) {
      const errMsg = e?.response?.data?.message ?? 'Failed to save';
      setExpErr(errMsg);
      message.error(errMsg);
    }
    setExpSaving(false);
  };

  const deleteExpense = async (id: string) => {
    setDeletingExp(id);
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(p => p.filter(e => e._id !== id));
      message.success('Expense deleted');
    } catch {
      message.error('Failed to delete expense');
    }
    setDeletingExp(null);
  };

  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const requests = records.filter(r => r.type === 'request');
  const manuals  = records.filter(r => r.type === 'manual');

  // ── Tab button style helper ────────────────────────────────────────────────
  const tabBtn = (tab: typeof activeTab): React.CSSProperties => ({
    padding: '7px 18px', borderRadius: 10, cursor: 'pointer',
    fontSize: 15, fontWeight: 700, fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em',
    transition: 'all 0.18s',height:40,
    background: activeTab === tab
      ? 'linear-gradient(135deg,#ef4444,#dc2626)'
      : 'var(--input-bg)',
    color:   activeTab === tab ? '#fff' : 'var(--text-dim)',
    border:  activeTab === tab ? 'none' : '1px solid var(--border)',
  });

  return (
    <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.12em', fontFamily:'Syne,sans-serif', margin:'0 0 2px' }}>PROCUREMENT</p>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>PURCHASE MANAGEMENT</h1>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:8, alignItems:'center',height:40 }}>
          <button style={tabBtn('procurement')} onClick={() => setActiveTab('procurement')}>
            📦 PROCUREMENT
          </button>
          <button style={tabBtn('expense')} onClick={() => setActiveTab('expense')}>
            💸 OTHER EXPENSE
          </button>
        </div>

        {/* ── Contextual action buttons ── */}
        {activeTab === 'procurement' ? (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowManual(true)} style={btnOutline}>＋ IN STORE</button>
            <button onClick={() => setShowRequest(true)} style={btnPrimary}>⊕ REQUEST</button>
            <button onClick={load} style={{ ...btnOutline, color:'var(--text-dim)', borderColor:'var(--border)' }}>↻</button>
          </div>
        ) : (
          <button onClick={loadExpenses} style={{ ...btnOutline, color:'var(--text-dim)', borderColor:'var(--border)' }}>↻</button>
        )}
      </div>

      {/* ── PROCUREMENT TAB ── */}
      {activeTab === 'procurement' && (
        <>
          {err && (
            <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, marginBottom:16, color:'#EF4444', fontSize:15 }}>
              {err}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Requests */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>PROCUREMENT REQUESTS</h2>
                  <p style={{ fontSize:15, color:'var(--text-dim)', margin:'2px 0 0', fontFamily:'Syne,sans-serif' }}>{requests.length} total</p>
                </div>
                <button onClick={() => setShowRequest(true)} style={btnPrimary}>⊕ NEW</button>
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {loading ? (
                  <p style={{ textAlign:'center', color:'var(--text-dim)', padding:30, fontSize:15 }}>Loading…</p>
                ) : requests.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-dim)', padding:30, fontSize:15 }}>No requests yet</p>
                ) : requests.map(rec => (
                  <RecordCard key={rec._id} rec={rec} onReceive={receive} onCancel={cancel} acting={acting} />
                ))}
              </div>
            </div>

            {/* Manual purchases */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>MANUAL PURCHASES</h2>
                  <p style={{ fontSize:15, color:'var(--text-dim)', margin:'2px 0 0', fontFamily:'Syne,sans-serif' }}>{manuals.length} total</p>
                </div>
                <button onClick={() => setShowManual(true)} style={btnPrimary}>＋ NEW</button>
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {loading ? (
                  <p style={{ textAlign:'center', color:'var(--text-dim)', padding:30, fontSize:15 }}>Loading…</p>
                ) : manuals.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-dim)', padding:30, fontSize:15 }}>No manual purchases yet</p>
                ) : manuals.map(rec => (
                  <RecordCard key={rec._id} rec={rec} onReceive={receive} onCancel={cancel} acting={acting} />
                ))}
              </div>
            </div>
          </div>

          {showRequest && (
            <RequestModal onClose={() => setShowRequest(false)} onDone={() => { setShowRequest(false); load(); }} />
          )}
          {showManual && (
            <ManualModal onClose={() => setShowManual(false)} onDone={() => { setShowManual(false); load(); }} />
          )}
        </>
      )}

      {/* ── OTHER EXPENSE TAB ── */}
      {activeTab === 'expense' && (
        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>

          {/* ── Left: Add form ── */}
          <div style={{ ...card, height:'auto' }}>
            <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:'0 0 18px' }}>ADD EXPENSE</h2>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', display:'block', marginBottom:5 }}>
                EXPENSE NAME *
              </label>
              <input
                placeholder="e.g. Electricity bill"
                value={expName}
                onChange={e => setExpName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExpense()}
                style={inputSt}
              />
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:15, fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', display:'block', marginBottom:5 }}>
                AMOUNT (SR) *
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:15, fontWeight:700, color:'var(--text-dim)', pointerEvents:'none' }}>SR</span>
                <input
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  style={{ ...inputSt, paddingLeft:30 }}
                />
              </div>
            </div>

            {expErr && <p style={{ fontSize:15, color:'#EF4444', marginBottom:10 }}>{expErr}</p>}

            <button
              onClick={addExpense}
              disabled={expSaving}
              style={{ ...btnPrimary, width:'100%', padding:11 }}
            >
              {expSaving ? 'Saving…' : '+ SAVE EXPENSE'}
            </button>
          </div>

          {/* ── Right: Expense list ── */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>OTHER EXPENSES</h2>
                <p style={{ fontSize:15, color:'var(--text-dim)', margin:'2px 0 0', fontFamily:'Syne,sans-serif' }}>{expenses.length} total</p>
              </div>
              {expenses.length > 0 && (
                <div style={{ background:'var(--primary-bg)', border:'1px solid var(--primary-border)', borderRadius:10, padding:'5px 14px' }}>
                  <span style={{ fontSize:15, color:'var(--text-dim)', fontFamily:'Syne,sans-serif', fontWeight:700 }}>TOTAL </span>
                  <span style={{ fontSize:15, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif' }}>SR {expTotal.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ flex:1, overflowY:'auto' }}>
              {expLoading ? (
                <p style={{ textAlign:'center', color:'var(--text-dim)', padding:30, fontSize:15 }}>Loading…</p>
              ) : expenses.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:180, gap:8, opacity:0.4 }}>
                  <span style={{ fontSize:32 }}>💸</span>
                  <p style={{ fontSize:15, color:'var(--text-dim)', fontFamily:'Syne,sans-serif' }}>No expenses yet</p>
                </div>
              ) : expenses.map(exp => {
                const date = new Date(exp.createdAt).toLocaleDateString();
                const time = new Date(exp.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                const isDeleting = deletingExp === exp._id;
                return (
                  <div key={exp._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.name}</p>
                      <p style={{ fontSize:15, color:'var(--text-dim)', margin:0 }}>{date} · {time}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif' }}>SR {exp.amount.toFixed(2)}</span>
                      <button
                        onClick={() => deleteExpense(exp._id)}
                        disabled={isDeleting}
                        title="Delete"
                        style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.07)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: isDeleting ? 0.5 : 1 }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Record Card ───────────────────────────────────────────────────────────────
function RecordCard({ rec, onReceive, onCancel, acting }: {
  rec: ProcRecord;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
  acting: string | null;
}) {
  const cfg = STATUS_CFG[rec.status] ?? STATUS_CFG.pending;
  const isActing = acting === rec._id;
  const date = new Date(rec.createdAt).toLocaleDateString();
  const time = new Date(rec.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  return (
    <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:'0 0 2px' }}>{rec.referenceId}</p>
          <p style={{ fontSize:15, color:'var(--text-dim)', margin:0 }}>{date} · {time}</p>
        </div>
        <span style={{ fontSize:15, fontWeight:700, color:cfg.color, background:`${cfg.color}18`, padding:'2px 9px', borderRadius:20, border:`1px solid ${cfg.color}40`, fontFamily:'Syne,sans-serif' }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ marginBottom:rec.status === 'pending' ? 10 : 0 }}>
        {rec.items.map((item, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--border)', fontSize:15 }}>
            <span style={{ color:'var(--text)' }}>{item.name}</span>
            <span style={{ color:'var(--text-dim)' }}>
              {item.quantity} {item.unit}
              {item.pricePerUnit > 0 && ` · SR ${(item.pricePerUnit * item.quantity).toFixed(2)}`}
            </span>
          </div>
        ))}
        {rec.totalAmount > 0 && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif' }}>Total: SR {rec.totalAmount.toFixed(2)}</span>
          </div>
        )}
        {rec.notes && <p style={{ fontSize:15, color:'var(--text-dim)', margin:'6px 0 0' }}>Note: {rec.notes}</p>}
      </div>

      {rec.status === 'pending' && (
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={() => onReceive(rec._id)} disabled={isActing}
            style={{ flex:1, padding:'7px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#22C55E,#15803D)', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer',height: 50, fontFamily:'Syne,sans-serif', opacity: isActing ? 0.6 : 1 }}>
            {isActing ? '…' : '✓ RECEIVED'}
          </button>
          <button onClick={() => onCancel(rec._id)} disabled={isActing}
            style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#EF4444', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'Syne,sans-serif', opacity: isActing ? 0.6 : 1 }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
