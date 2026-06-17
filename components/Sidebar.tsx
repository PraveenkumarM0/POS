'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
   { href: '/menu', label: 'Menu',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  },
  { href: '/', label: 'Home',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  },
 
  { href: '/tables', label: 'Tables',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="3" rx="1.5" stroke="currentColor" strokeWidth="2"/><path d="M5 10v7M19 10v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  },
  { href: '/orders', label: 'Orders',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  },
  { href: '/branches', label: 'Branches',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{width:64,background:'var(--bg)',borderRight:'1px solid var(--border)'}}
      className="flex flex-col items-center py-4 gap-1 shrink-0 z-40">
      {NAV.map(({ href, label, icon }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} title={label}
            style={{
              width:48, height:48, borderRadius:10,
              background: active ? 'var(--primary-bg)' : 'transparent',
              border: active ? '1px solid var(--primary-border)' : '1px solid transparent',
              color: active ? 'var(--primary)' : 'var(--text-dim)',
              transition:'all 0.2s',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              textDecoration:'none',
            }}
            className="hover:!bg-white/5 hover:!text-white/60"
          >
            {icon}
            <span style={{fontSize:13,fontWeight:700,letterSpacing:'0.05em',fontFamily:'Syne,sans-serif'}}>{label.toUpperCase()}</span>
          </Link>
        );
      })}
      <div style={{flex:1}}/>
      <button title="Settings" style={{width:48,height:48,borderRadius:10,background:'transparent',border:'1px solid transparent',color:'var(--text-dim)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',transition:'all 0.2s'}}
        className="hover:!bg-white/5 hover:!text-white/40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:'0.05em',fontFamily:'Syne,sans-serif'}}>SET</span>
      </button>
    </aside>
  );
}