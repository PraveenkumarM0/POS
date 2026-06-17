'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';

const NAV = [
  { href: '/menu', label: 'Menu',
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="5" rx="1.5" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><rect x="3" y="11" width="7" height="10" rx="1.5" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><rect x="14" y="3" width="7" height="10" rx="1.5" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><rect x="14" y="16" width="7" height="5" rx="1.5" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/></svg>
  },
  { href: '/tables', label: 'Tables',
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="3" rx="1.5" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><path d="M5 11v6M19 11v6M8 17h8" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round"/></svg>
  },
  { href: '/orders', label: 'Orders',
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M9 12h6M9 16h4" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round"/></svg>
  },
  { href: '/online-orders', label: 'Online', badge: 3,
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><path d="M2 12h20M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" stroke={a?'var(--primary)':'currentColor'} strokeWidth="1.5" strokeLinecap="round"/></svg>
  },
  { href: '/kds', label: 'KDS',
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><path d="M8 21h8M12 17v4" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round"/><path d="M6 8h4M6 11h8" stroke={a?'var(--primary)':'currentColor'} strokeWidth="1.5" strokeLinecap="round"/></svg>
  },
  {
    href:'/procurement', label:'Procurement',
    icon:(a:boolean)=><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={a?'var(--primary-bg)':'none'}/></svg>,
  },
  //  { href: '/branches', label: 'Branches',
  //   icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  // },
  // {
  //   href:'/expense', label:'Expenses',
  //   icon:(a:boolean)=><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><path d="M2 10h20" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2"/><circle cx="7" cy="15" r="1.5" fill={a?'var(--primary)':'currentColor'}/></svg>,
  // },
  { href: '/admin', label: 'Admin',
    icon: (a:boolean) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" fill={a?'var(--primary-bg)':'none'}/><path d="M7 11V7a5 5 0 0110 0v4" stroke={a?'var(--primary)':'currentColor'} strokeWidth="2" strokeLinecap="round"/></svg>
  },
];

function ShiftModal({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const { session } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [closing, setClosingCash] = useState('');

  if (!session) return null;

  const startTime = new Date(session.startTime);
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const cashSales = session.cashTransactions.reduce((s, t) => s + t.amount, 0);
  const totalSales = session.sales;
  const cashInDrawer = session.openingCash + cashSales;
  const closingCashNum = parseFloat(closing) || 0;
  const variance = closingCashNum - cashInDrawer;

  const printShiftReport = () => {
    const dateStr = now.toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
    const html = `<!DOCTYPE html><html><head><title>Shift Report</title>
<style>
  *{box-sizing:border-box;} body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:14px 10px;font-size:12px;color:#111;}
  .center{text-align:center;} .bold{font-weight:bold;} .big{font-size:17px;font-weight:900;}
  .divider{border:none;border-top:1px dashed #666;margin:8px 0;}
  .row{display:flex;justify-content:space-between;margin:3px 0;}
  .total-row{display:flex;justify-content:space-between;font-weight:900;font-size:14px;border-top:2px solid #111;padding-top:5px;margin-top:5px;}
  .section{margin-top:6px;}
  .badge{background:#111;color:#fff;padding:2px 10px;border-radius:20px;font-size:10px;display:inline-block;margin:3px 0;}
</style></head><body>
<div class="center">
  <div class="big">RESTOPOS</div>
  <div style="font-size:11px;color:#666;">End of Shift Report</div>
  <hr class="divider"/>
  <div class="bold">${session.user.name.toUpperCase()}</div>
  <div class="badge">${session.user.cashierId}</div>
  <div style="font-size:10px;color:#888;">${dateStr}</div>
</div>
<hr class="divider"/>
<div class="section">
  <div class="bold" style="margin-bottom:4px;">SHIFT SUMMARY</div>
  <div class="row"><span>Start Time</span><span>${startTime.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true})}</span></div>
  <div class="row"><span>End Time</span><span>${now.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true})}</span></div>
  <div class="row"><span>Duration</span><span>${durationStr}</span></div>
  <div class="row"><span>Transactions</span><span>${session.transactions}</span></div>
</div>
<hr class="divider"/>
<div class="section">
  <div class="bold" style="margin-bottom:4px;">SALES</div>
  <div class="row"><span>Total Sales</span><span>SR ${totalSales.toFixed(2)}</span></div>
  <div class="row"><span>Cash Sales</span><span>SR ${cashSales.toFixed(2)}</span></div>
  <div class="row"><span>Other</span><span>SR ${(totalSales - cashSales).toFixed(2)}</span></div>
</div>
<hr class="divider"/>
<div class="section">
  <div class="bold" style="margin-bottom:4px;">CASH DRAWER</div>
  <div class="row"><span>Opening Float</span><span>SR ${session.openingCash.toFixed(2)}</span></div>
  <div class="row"><span>Cash Collected</span><span>SR ${cashSales.toFixed(2)}</span></div>
  <div class="row"><span>Expected in Drawer</span><span>SR ${cashInDrawer.toFixed(2)}</span></div>
  ${closing ? `<div class="row"><span>Counted Cash</span><span>SR ${closingCashNum.toFixed(2)}</span></div>
  <div class="row"><span>Variance</span><span style="${variance < 0 ? 'color:red' : ''}">${variance >= 0 ? '+' : ''}SR ${variance.toFixed(2)}</span></div>` : ''}
</div>
${session.cashTransactions.length > 0 ? `
<hr class="divider"/>
<div class="section">
  <div class="bold" style="margin-bottom:4px;">TRANSACTIONS</div>
  ${session.cashTransactions.slice(0,10).map(t => `<div class="row"><span>${t.id}</span><span>SR ${t.amount.toFixed(2)}</span></div>`).join('')}
  ${session.cashTransactions.length > 10 ? `<div style="font-size:10px;color:#888;text-align:center;">+${session.cashTransactions.length-10} more</div>` : ''}
</div>` : ''}
<hr class="divider"/>
<div class="center" style="font-size:10px;color:#888;margin-top:6px;">Shift closed — ${dateStr}</div>
</body></html>`;
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.90)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="anim-scale" style={{ background:'var(--modal-bg)', border:'1px solid var(--border)', borderRadius:22, width:420, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 40px 100px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ padding:'20px 22px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,68,68,0.12)', border:'1px solid rgba(255,68,68,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#FF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>End Shift & Logout</h2>
            <p style={{ fontSize:13, color:'var(--text-dim)', margin:0 }}>Review your shift summary before closing</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Cashier card */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--primary-bg)', border:'1px solid var(--primary-border)', borderRadius:14 }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--primary-dim))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>{session.user.name}</p>
              <p style={{ fontSize:13, color:'var(--primary)', fontWeight:700, margin:'2px 0 0', letterSpacing:'0.04em' }}>{session.user.cashierId} · {session.user.role.toUpperCase()}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>Shift Duration</p>
              <p style={{ fontSize:16, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', margin:0 }}>{durationStr}</p>
            </div>
          </div>

          {/* Shift stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'Total Sales',    value:`SR ${totalSales.toFixed(2)}`,      color:'var(--primary)', icon:'💰' },
              { label:'Transactions',   value:String(session.transactions),         color:'#60A5FA',        icon:'🧾' },
              { label:'Cash Sales',     value:`SR ${cashSales.toFixed(2)}`,        color:'#22C55E',        icon:'💵' },
              { label:'Start Time',     value:startTime.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',hour12:true}), color:'#FBBF24', icon:'⏰' },
            ].map(s => (
              <div key={s.label} style={{ background:`${s.color}10`, border:`1px solid ${s.color}25`, borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', margin:'0 0 5px' }}>{s.label.toUpperCase()}</p>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                  <span style={{ fontSize:15, fontWeight:800, color:s.color, fontFamily:'Syne,sans-serif' }}>{s.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cash drawer section */}
          <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>💰</span>
              <span style={{ fontSize:13, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif', letterSpacing:'0.04em' }}>CASH DRAWER</span>
            </div>
            <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { lbl:'Opening Float',    val:`SR ${session.openingCash.toFixed(2)}`,  color:'var(--text-muted)' },
                { lbl:'+ Cash Collected', val:`SR ${cashSales.toFixed(2)}`,            color:'#22C55E' },
                { lbl:'= Expected Total', val:`SR ${cashInDrawer.toFixed(2)}`,         color:'var(--text)', bold:true },
              ].map(r => (
                <div key={r.lbl} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:13, color:'var(--text-dim)' }}>{r.lbl}</span>
                  <span style={{ fontSize:12, fontWeight: r.bold ? 800 : 600, color:r.color, fontFamily: r.bold ? 'Syne,sans-serif' : 'inherit' }}>{r.val}</span>
                </div>
              ))}

              {/* Closing cash input */}
              <div style={{ marginTop:6 }}>
                <label style={{ fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:'0.08em', fontFamily:'Syne,sans-serif', display:'block', marginBottom:6 }}>COUNT CLOSING CASH (SR) — OPTIONAL</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:700, color:'#22C55E', fontFamily:'Syne,sans-serif' }}>SR</span>
                  <input type="number" min="0" placeholder="0.00" value={closing} onChange={e => setClosingCash(e.target.value)}
                    style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, padding:'9px 12px 9px 40px', color:'var(--text)', fontSize:14, fontWeight:700, outline:'none', fontFamily:'Syne,sans-serif', boxSizing:'border-box' }}
                    onFocus={e => (e.currentTarget as HTMLElement).style.borderColor='rgba(34,197,94,0.5)'}
                    onBlur={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'}/>
                </div>
                {closing && (
                  <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, background: variance < 0 ? 'rgba(255,68,68,0.08)' : 'rgba(34,197,94,0.08)', border:`1px solid ${variance < 0 ? 'rgba(255,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                    <span style={{ fontSize:13, color:'var(--text-dim)', fontWeight:700 }}>{variance < 0 ? '⚠ Shortage' : '✔ Overage'}</span>
                    <span style={{ fontSize:12, fontWeight:800, color: variance < 0 ? '#FF4444' : '#22C55E', fontFamily:'Syne,sans-serif' }}>
                      {variance >= 0 ? '+' : ''}SR {variance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent transactions preview */}
          {session.cashTransactions.length > 0 && (
            <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14 }}>🧾</span>
                <span style={{ fontSize:13, fontWeight:800, color:'var(--text)', fontFamily:'Syne,sans-serif' }}>RECENT TRANSACTIONS</span>
                <span style={{ fontSize:12, color:'var(--text-dim)', marginLeft:'auto' }}>{session.transactions} total</span>
              </div>
              <div style={{ maxHeight:140, overflowY:'auto' }}>
                {session.cashTransactions.slice(0, 6).map(tx => (
                  <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 14px', borderBottom:'1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'Syne,sans-serif' }}>{tx.id}</span>
                      <span style={{ fontSize:12, color:'var(--text-dim)', marginLeft:8 }}>{tx.time} · {tx.items} items</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--primary)', fontFamily:'Syne,sans-serif' }}>SR {tx.amount.toFixed(2)}</span>
                  </div>
                ))}
                {session.transactions > 6 && (
                  <div style={{ padding:'6px 14px', fontSize:12, color:'var(--text-dim)', textAlign:'center' }}>+{session.transactions - 6} more transactions</div>
                )}
              </div>
            </div>
          )}

          {/* Confirm checkbox */}
          <div onClick={() => setConfirmed(c => !c)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background: confirmed ? 'rgba(255,68,68,0.08)' : 'var(--input-bg)', border:`1px solid ${confirmed ? 'rgba(255,68,68,0.4)' : 'var(--border)'}`, borderRadius:12, cursor:'pointer', transition:'all 0.2s' }}>
            <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${confirmed ? '#FF4444' : 'var(--border)'}`, background: confirmed ? '#FF4444' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
              {confirmed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <p style={{ fontSize:13, color: confirmed ? 'var(--text)' : 'var(--text-dim)', fontWeight: confirmed ? 700 : 500, margin:0, lineHeight:1.4 }}>
              I confirm the drawer has been counted and the shift is complete
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={printShiftReport}
              style={{ width:'100%', padding:'11px', borderRadius:10, background:'var(--primary-bg)', border:'1px solid var(--primary-border)', color:'var(--primary)', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Syne,sans-serif', letterSpacing:'0.04em' }}>
              🖨 PRINT SHIFT REPORT
            </button>
            <button onClick={() => { if (confirmed) onLogout(); }}
              style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', fontSize:13, fontWeight:800, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em', transition:'all 0.2s',
                cursor: confirmed ? 'pointer' : 'not-allowed',
                background: confirmed ? 'linear-gradient(135deg,#FF4444,#CC2222)' : 'var(--input-bg)',
                color: confirmed ? 'white' : 'var(--text-dim)',
                boxShadow: confirmed ? '0 6px 20px rgba(255,68,68,0.4)' : 'none',
              }}>
              {confirmed ? '✅ END SHIFT & LOGOUT' : 'Tick the box above to confirm'}
            </button>
            <button onClick={onClose}
              style={{ width:'100%', padding:'10px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
              Cancel — Keep Working
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [showShift, setShowShift] = useState(false);
  const path = usePathname();
  const { session, logout, isAdmin, isCook } = useAuth();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      const h = now.getHours();
      setTime(`${p(h > 12 ? h - 12 : h || 12)}:${p(now.getMinutes())}:${p(now.getSeconds())} ${h >= 12 ? 'PM' : 'AM'}`);
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  // Map each nav href to the permission key it requires
  const PERM_MAP: Record<string, string> = {
    '/menu':          'menu',
    '/tables':        'tables',
    '/orders':        'orders',
    '/online-orders': 'online',
    '/kds':           'kds',
    '/purchase':      'procurement',
    '/admin':         'admin',
  };

  const userPerms: string[] = session?.user?.permissions ?? [];

  // Show a nav item when the user has the matching permission.
  // Admin permission is special: only admins see the Admin link.
  const navItems = NAV.filter(n => {
    const required = PERM_MAP[n.href];
    if (!required) return true;                          // no guard (e.g. Home)
    if (required === 'admin') return isAdmin;            // admin link -> admin only
    return isAdmin || userPerms.includes(required);      // admin sees everything
  });

  const handleLogout = () => { logout(); setShowShift(false); };

  return (
    <>
      <header style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--primary-border)', height: 72, flexShrink: 0, zIndex: 100, display: 'flex', alignItems: 'center' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', borderRight: '1px solid var(--border)', height: '100%', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>RESTO<span style={{ color: 'var(--primary)' }}>POS</span></span>
        </div>

        {/* Nav */}
        <nav className="topbar-nav" style={{ display: 'flex', alignItems: 'center', height: '100%', flex: 1 }}>
          {navItems.map(({ href, label, icon, badge }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%', padding: '0 20px', textDecoration: 'none',
                  color: active ? 'var(--primary)' : 'var(--text-dim)', borderBottom: `3px solid ${active ? 'var(--primary)' : 'transparent'}`,
                  background: active ? 'var(--primary-bg)' : 'transparent', transition: 'color 0.18s, border-color 0.18s, background 0.18s', minWidth: 76, flexShrink: 0 }}>
                {icon(active)}
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>{label.toUpperCase()}</span>
                {badge && <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: 'white', fontSize: 14, fontWeight: 800, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--header-bg)' }}>{badge}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', flexShrink: 0 }}>

          {/* Dark/Light toggle */}
          <button onClick={toggle} title={isDark ? 'Light Mode' : 'Dark Mode'}
            style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--input-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
            {isDark
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          {/* Clock */}
          <div style={{ display: 'flex',flexDirection: 'column', alignItems: 'center', gap: 5, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 9px' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="var(--text-dim)" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{date}</span> <div style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '3px 9px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em' }}>{time}</span>
          </div>
          </div>


          {session && !isAdmin && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

              {/* Float Cash + END SHIFT — always visible inline panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '5px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, flexShrink: 0 }}>
                {/* Float row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="var(--text-dim)" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="var(--text-dim)" strokeWidth="2"/></svg>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>FLOAT CASH</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginLeft: 2 }}>SR {session.openingCash}</span>
                </div>
                {/* END SHIFT button */}
                <button
                  onClick={() => isCook ? handleLogout() : setShowShift(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,68,68,0.35)', background: 'rgba(255,68,68,0.08)', color: '#FF4444', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.08)'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {isCook ? 'LOGOUT' : 'END SHIFT'}
                </button>
              </div>

            </>
          )}
        </div>
      </header>

      {/* Shift checkout modal */}
      {showShift && session && (
        <ShiftModal onClose={() => setShowShift(false)} onLogout={handleLogout} />
      )}
    </>
  );
}
