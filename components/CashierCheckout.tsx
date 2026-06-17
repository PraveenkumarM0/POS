'use client';
import { useState, useEffect } from 'react';
import { useAuth, Session } from '@/lib/AuthContext';

function elapsed(startTime: string) {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return { h, m, s, str: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` };
}

function printShiftReport(session: Session, closingCash: number) {
  const now = new Date();
  const start = new Date(session.startTime);
  const dur = elapsed(session.startTime);
  const expected = session.openingCash + session.sales;
  const diff = closingCash - expected;
  const html = `<!DOCTYPE html><html><head><title>Shift Report</title>
<style>
  *{box-sizing:border-box;} body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:12px 8px;font-size:12px;color:#111;}
  .center{text-align:center;} .bold{font-weight:bold;} .big{font-size:18px;font-weight:900;}
  .divider{border:none;border-top:1px dashed #666;margin:8px 0;}
  .row{display:flex;justify-content:space-between;margin:3px 0;}
  .green{color:#15803D;} .red{color:#DC2626;}
</style></head><body>
<div class="center">
  <div class="big">RESTOPOS</div>
  <div>Cashier Shift Report</div>
  <hr class="divider"/>
  <div class="bold">${session.user.name} · ${session.user.cashierId}</div>
  <div style="font-size:10px;color:#666;">${start.toLocaleString('en-SA')} → ${now.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true})}</div>
  <div style="font-size:10px;color:#666;">Duration: ${dur.h}h ${dur.m}m</div>
</div>
<hr class="divider"/>
<div class="bold" style="margin-bottom:4px;">SHIFT SUMMARY</div>
<div class="row"><span>Opening Cash</span><span>SR ${session.openingCash.toFixed(2)}</span></div>
<div class="row"><span>Total Sales</span><span>SR ${session.sales.toFixed(2)}</span></div>
<div class="row"><span>Transactions</span><span>${session.transactions}</span></div>
<hr class="divider"/>
<div class="row"><span>Expected Cash</span><span>SR ${expected.toFixed(2)}</span></div>
<div class="row"><span>Closing Cash</span><span>SR ${closingCash.toFixed(2)}</span></div>
<div class="row bold ${diff >= 0 ? 'green' : 'red'}"><span>Variance</span><span>${diff >= 0 ? '+' : ''}SR ${diff.toFixed(2)}</span></div>
<hr class="divider"/>
${session.cashTransactions.length > 0 ? `
<div class="bold" style="margin-bottom:4px;">TRANSACTIONS</div>
${session.cashTransactions.slice(0,10).map(tx => `<div class="row"><span>${tx.id} · ${tx.time}</span><span>SR ${tx.amount.toFixed(2)}</span></div>`).join('')}
${session.cashTransactions.length > 10 ? `<div style="color:#666;font-size:10px;text-align:center;">+ ${session.cashTransactions.length - 10} more</div>` : ''}
<hr class="divider"/>` : ''}
<div class="center" style="font-size:10px;color:#888;margin-top:10px;">
  <div>Shift closed by cashier</div>
  <div>Supervisor signature: ___________</div>
</div>
</body></html>`;
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) return;
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 400);
}

type Step = 'menu' | 'summary' | 'closing-cash' | 'confirm' | 'done';

export default function CashierCheckout({ onClose }: { onClose: () => void }) {
  const { session, logout } = useAuth();
  const [step, setStep] = useState<Step>('menu');
  const [closingCash, setClosingCash] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  const dur = elapsed(session.startTime);
  const closingCashNum = parseFloat(closingCash) || 0;
  const expectedCash = session.openingCash + session.sales;
  const variance = closingCashNum - expectedCash;
  const startDate = new Date(session.startTime);

  // ── MENU (initial popup) ───────────────────────────────────────────────────
  if (step === 'menu') return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingTop:60, paddingRight:16 }} onClick={onClose}>
      <div className="anim-scale" style={{ background:'var(--modal-bg)', border:'1px solid var(--primary-border)', borderRadius:18, width:290, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>

        {/* Header — shift info */}
        <div style={{ background:'var(--primary-bg)', borderBottom:'1px solid var(--primary-border)', padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--primary-dim))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>{session.user.name}</p>
              <p style={{ fontSize:13, color:'var(--primary)', fontWeight:700, margin:0, letterSpacing:'0.04em' }}>{session.user.cashierId} · {session.user.role.toUpperCase()}</p>
            </div>
          </div>

          {/* Live shift timer */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ display:'flex', gap:3, alignItems:'center' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', display:'block', boxShadow:'0 0 6px #22C55E', animation:'pulse 2s infinite' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#22C55E', fontFamily:'Syne,sans-serif', letterSpacing:'0.08em' }}>SHIFT ACTIVE</span>
            </div>
            <div style={{ flex:1 }}/>
            <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{dur.str}</span>
          </div>

          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <div style={{ flex:1, background:'rgba(0,0,0,0.2)', borderRadius:8, padding:'7px 10px', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'var(--text-dim)', fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'0.06em', margin:0 }}>SALES</p>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif', margin:0 }}>SR {session.sales.toFixed(2)}</p>
            </div>
            <div style={{ flex:1, background:'rgba(0,0,0,0.2)', borderRadius:8, padding:'7px 10px', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'var(--text-dim)', fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'0.06em', margin:0 }}>ORDERS</p>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>{session.transactions}</p>
            </div>
            <div style={{ flex:1, background:'rgba(0,0,0,0.2)', borderRadius:8, padding:'7px 10px', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'var(--text-dim)', fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'0.06em', margin:0 }}>SINCE</p>
              <p style={{ fontSize:13, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>{startDate.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true})}</p>
            </div>
          </div>
        </div>

        {/* Menu options */}
        <div style={{ padding:'10px' }}>
          <button onClick={() => setStep('summary')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, border:'none', background:'var(--input-bg)', cursor:'pointer', marginBottom:6, transition:'all 0.15s', textAlign:'left' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--hover-bg)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='var(--input-bg)'}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#22C55E" strokeWidth="2"/><path d="M9 9h6M9 12h6M9 15h4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:0, fontFamily:'Syne,sans-serif' }}>Shift Summary</p>
              <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>View full shift details & transactions</p>
            </div>
            <svg style={{ marginLeft:'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>

          <button onClick={() => setStep('closing-cash')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, border:'1px solid rgba(255,68,68,0.25)', background:'rgba(255,68,68,0.06)', cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,68,68,0.12)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(255,68,68,0.06)'}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#FF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:800, color:'#FF4444', margin:0, fontFamily:'Syne,sans-serif' }}>Checkout / Close Shift</p>
              <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>Enter closing cash & end shift</p>
            </div>
            <svg style={{ marginLeft:'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#FF4444" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding:'0 10px 10px' }}>
          <button onClick={onClose}
            style={{ width:'100%', padding:'9px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  // Shared modal wrapper
  const Modal = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
    <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div className="anim-scale" style={{ background:'var(--modal-bg)', border:'1px solid var(--primary-border)', borderRadius:20, width: wide ? 460 : 380, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.9)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  // ── SHIFT SUMMARY ─────────────────────────────────────────────────────────
  if (step === 'summary') return (
    <Modal wide>
      <div style={{ background:'var(--primary-bg)', borderBottom:'1px solid var(--primary-border)', padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <button onClick={() => setStep('menu')} style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
          <div>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>Shift Summary</h2>
            <p style={{ fontSize:13, color:'var(--text-dim)', margin:'2px 0 0' }}>{session.user.name} · {session.user.cashierId}</p>
          </div>
          <div style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:20, fontWeight:800, color:'var(--primary)' }}>{dur.str}</div>
        </div>
      </div>

      <div style={{ padding:'20px 24px' }}>
        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
          {[
            { label:'TOTAL SALES', value:`SR ${session.sales.toFixed(2)}`, color:'var(--primary)', icon:'💰' },
            { label:'TRANSACTIONS', value:String(session.transactions), color:'#60A5FA', icon:'🧾' },
            { label:'SHIFT HOURS', value:`${dur.h}h ${dur.m}m`, color:'#22C55E', icon:'⏱' },
            { label:'OPENING CASH', value:`SR ${session.openingCash.toFixed(2)}`, color:'#FBBF24', icon:'🏦' },
            { label:'AVG ORDER', value: session.transactions > 0 ? `SR ${(session.sales/session.transactions).toFixed(2)}` : '—', color:'#A78BFA', icon:'📊' },
            { label:'START TIME', value: startDate.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true}), color:'var(--text-muted)', icon:'🕐' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:12, padding:'12px', textAlign:'center' }}>
              <p style={{ fontSize:14, margin:'0 0 4px' }}>{s.icon}</p>
              <p style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', margin:'0 0 3px' }}>{s.label}</p>
              <p style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:'Syne,sans-serif', margin:0, lineHeight:1.2 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        {session.cashTransactions.length > 0 && (
          <>
            <p style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.1em', fontFamily:'Syne,sans-serif', marginBottom:10 }}>RECENT TRANSACTIONS</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:18 }}>
              {session.cashTransactions.slice(0,8).map((tx, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--input-bg)', borderRadius:9, border:'1px solid var(--border)' }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:'var(--primary-bg)', border:'1px solid var(--primary-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif' }}>#{i+1}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{tx.id}</p>
                    <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>{tx.items} items · {tx.time}</p>
                  </div>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--primary)', fontFamily:'Syne,sans-serif', margin:0 }}>SR {tx.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setStep('closing-cash')}
            style={{ flex:1, padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:800, fontFamily:'Syne,sans-serif', background:'linear-gradient(135deg,#FF4444,#B91C1C)', color:'white', boxShadow:'0 4px 14px rgba(255,68,68,0.3)' }}>
            CHECKOUT →
          </button>
          <button onClick={() => printShiftReport(session, 0)}
            style={{ padding:'12px 16px', borderRadius:10, border:'1px solid var(--primary-border)', background:'var(--primary-bg)', color:'var(--primary)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            🖨 PRINT
          </button>
        </div>
      </div>
    </Modal>
  );

  // ── CLOSING CASH ENTRY ────────────────────────────────────────────────────
  if (step === 'closing-cash') return (
    <Modal>
      <div style={{ background:'rgba(255,68,68,0.08)', borderBottom:'1px solid rgba(255,68,68,0.2)', padding:'18px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setStep('menu')} style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', flexShrink:0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
          <div>
            <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>Close Shift</h2>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, letterSpacing:'0.06em' }}>{session.user.name} · Shift: {dur.h}h {dur.m}m</p>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 22px' }}>
        {/* Expected cash */}
        <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:13, color:'var(--text-dim)' }}>Opening cash</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>SR {session.openingCash.toFixed(2)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, color:'var(--text-dim)' }}>Cash sales ({session.transactions} orders)</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--primary)' }}>+ SR {session.sales.toFixed(2)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif' }}>Expected in drawer</span>
            <span style={{ fontSize:14, fontWeight:800, color:'#22C55E', fontFamily:'Syne,sans-serif' }}>SR {expectedCash.toFixed(2)}</span>
          </div>
        </div>

        {/* Closing cash input */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', display:'block', marginBottom:7 }}>
            COUNT YOUR DRAWER — ENTER CLOSING CASH (SR)
          </label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:800, color:'#22C55E', fontFamily:'Syne,sans-serif', pointerEvents:'none' }}>SR</span>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={closingCash}
              onChange={e => setClosingCash(e.target.value)} autoFocus
              style={{ width:'100%', background:'var(--input-bg)', border:'1px solid rgba(34,197,94,0.4)', borderRadius:12, padding:'14px 14px 14px 46px', color:'var(--text)', fontSize:22, fontWeight:800, outline:'none', fontFamily:'Syne,sans-serif', boxSizing:'border-box' }}/>
          </div>
        </div>

        {/* Quick amounts */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {[session.openingCash, expectedCash, Math.round(expectedCash/100)*100, Math.ceil(expectedCash/500)*500]
            .filter((v,i,a) => a.indexOf(v) === i && v > 0).slice(0,4).map(amt => (
            <button key={amt} onClick={() => setClosingCash(amt.toFixed(2))}
              style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${closingCash === amt.toFixed(2) ? 'rgba(34,197,94,0.5)' : 'var(--border)'}`, background: closingCash === amt.toFixed(2) ? 'rgba(34,197,94,0.1)' : 'var(--input-bg)', color: closingCash === amt.toFixed(2) ? '#22C55E' : 'var(--text-muted)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
              SR {amt.toFixed(0)}
            </button>
          ))}
        </div>

        {/* Live variance preview */}
        {closingCash !== '' && (
          <div style={{ background: variance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(255,68,68,0.08)', border:`1px solid ${variance >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,68,68,0.3)'}`, borderRadius:12, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', margin:0 }}>VARIANCE</p>
              <p style={{ fontSize:12, color:'var(--text-dim)', margin:'2px 0 0' }}>{variance >= 0 ? 'Cash over' : 'Cash short'}</p>
            </div>
            <p style={{ fontSize:22, fontWeight:800, color: variance >= 0 ? '#22C55E' : '#FF4444', fontFamily:'Syne,sans-serif', margin:0 }}>
              {variance >= 0 ? '+' : ''}SR {variance.toFixed(2)}
            </p>
          </div>
        )}

        <button onClick={() => closingCash !== '' && setStep('confirm')}
          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', cursor: closingCash !== '' ? 'pointer' : 'not-allowed', fontSize:12, fontWeight:800, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em', transition:'all 0.2s', marginBottom:8,
            background: closingCash !== '' ? 'linear-gradient(135deg,#FF4444,#B91C1C)' : 'var(--input-bg)',
            color: closingCash !== '' ? 'white' : 'var(--text-dim)',
            boxShadow: closingCash !== '' ? '0 4px 16px rgba(255,68,68,0.35)' : 'none' }}>
          REVIEW & CONFIRM CHECKOUT →
        </button>
        <button onClick={onClose}
          style={{ width:'100%', padding:'9px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
          Cancel — Keep Shift Open
        </button>
      </div>
    </Modal>
  );

  // ── CONFIRM CHECKOUT ──────────────────────────────────────────────────────
  if (step === 'confirm') return (
    <Modal>
      <div style={{ background:'rgba(255,68,68,0.07)', borderBottom:'1px solid rgba(255,68,68,0.2)', padding:'18px 22px' }}>
        <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:'0 0 4px' }}>Confirm Shift Checkout</h2>
        <p style={{ fontSize:13, color:'var(--text-dim)', margin:0 }}>This will end your shift. Please review before confirming.</p>
      </div>

      <div style={{ padding:'20px 22px' }}>
        {/* Summary card */}
        <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
          {[
            { lbl:'Cashier', val:`${session.user.name} (${session.user.cashierId})`, color:'var(--text)' },
            { lbl:'Shift Duration', val:`${dur.h}h ${dur.m}m`, color:'#60A5FA' },
            { lbl:'Total Sales', val:`SR ${session.sales.toFixed(2)}`, color:'var(--primary)' },
            { lbl:'Total Transactions', val:String(session.transactions), color:'var(--text)' },
            { lbl:'Opening Cash', val:`SR ${session.openingCash.toFixed(2)}`, color:'var(--text-muted)' },
            { lbl:'Expected in Drawer', val:`SR ${expectedCash.toFixed(2)}`, color:'#22C55E' },
            { lbl:'Closing Cash (entered)', val:`SR ${closingCashNum.toFixed(2)}`, color:'#22C55E' },
            { lbl:'Variance', val:`${variance >= 0 ? '+' : ''}SR ${variance.toFixed(2)}`, color: variance >= 0 ? '#22C55E' : '#FF4444' },
          ].map((r, i, arr) => (
            <div key={r.lbl} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none', background: r.lbl === 'Variance' ? (variance >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(255,68,68,0.06)') : 'transparent' }}>
              <span style={{ fontSize:13, color:'var(--text-dim)' }}>{r.lbl}</span>
              <span style={{ fontSize:13, fontWeight:800, color:r.color, fontFamily:'Syne,sans-serif' }}>{r.val}</span>
            </div>
          ))}
        </div>

        {Math.abs(variance) > 50 && (
          <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
            <p style={{ fontSize:13, color:'#FBBF24', fontWeight:700, margin:0 }}>⚠ Large variance detected. Please double-check your count before confirming.</p>
          </div>
        )}

        <button onClick={() => setStep('done')}
          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:800, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em', background:'linear-gradient(135deg,#FF4444,#B91C1C)', color:'white', boxShadow:'0 4px 16px rgba(255,68,68,0.35)', marginBottom:8 }}>
          ✓ CONFIRM & CLOSE SHIFT
        </button>
        <button onClick={() => setStep('closing-cash')}
          style={{ width:'100%', padding:'9px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
          ← Edit Closing Cash
        </button>
      </div>
    </Modal>
  );

  // ── DONE — SHIFT CLOSED ───────────────────────────────────────────────────
  if (step === 'done') return (
    <Modal>
      <div style={{ padding:'32px 28px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div className="anim-scale" style={{ width:72, height:72, borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid rgba(34,197,94,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:'0 0 4px' }}>Shift Closed!</h2>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>Great work, {session.user.name}</p>
        </div>

        {/* Final summary */}
        <div style={{ width:'100%', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {[
            { lbl:'Total Sales', val:`SR ${session.sales.toFixed(2)}`, color:'var(--primary)' },
            { lbl:'Transactions', val:String(session.transactions), color:'var(--text)' },
            { lbl:'Shift Duration', val:`${dur.h}h ${dur.m}m`, color:'#60A5FA' },
            { lbl:'Variance', val:`${variance >= 0 ? '+' : ''}SR ${variance.toFixed(2)}`, color: variance >= 0 ? '#22C55E' : '#FF4444' },
          ].map((r, i, arr) => (
            <div key={r.lbl} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:13, color:'var(--text-dim)' }}>{r.lbl}</span>
              <span style={{ fontSize:12, fontWeight:800, color:r.color, fontFamily:'Syne,sans-serif' }}>{r.val}</span>
            </div>
          ))}
        </div>

        <button onClick={() => printShiftReport(session, closingCashNum)}
          style={{ width:'100%', padding:'11px', borderRadius:10, background:'var(--primary-bg)', border:'1px solid var(--primary-border)', color:'var(--primary)', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
          🖨 PRINT SHIFT REPORT
        </button>

        <button onClick={() => { logout(); onClose(); }}
          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:800, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em', background:'linear-gradient(135deg,var(--primary),var(--primary-dim))', color:'white', boxShadow:'0 4px 16px rgba(232,68,58,0.35)' }}>
          SIGN OUT →
        </button>
      </div>
    </Modal>
  );

  return null;
}
