"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

type LoginMode = "choose" | "admin" | "cashier-pin" | "cashier-cash" | "cook-pin";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { session, loginAdmin, loginCashier, loginCook } = useAuth();
  const [mode, setMode] = useState<LoginMode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pin, setPin] = useState("");
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
  const [cashBreakdown, setCashBreakdown] = useState<Record<number, string>>({});

  useEffect(() => {
    if (mode === "admin" || mode === "cashier-cash") inputRef.current?.focus();
  }, [mode]);

  const shake = () => { setShaking(true); setTimeout(() => setShaking(false), 500); };

  const handleAdminLogin = async () => {
    if (!email || !password) { shake(); setError("Please enter email and password."); return; }
    const res = await loginAdmin(email, password);
    if (!res.ok) { shake(); setError(res.error || "Login failed"); }
  };

  const breakdownTotal = DENOMINATIONS.reduce((sum, note) => sum + note * Number(cashBreakdown[note] || 0), 0);

  const appendPin = (d: string) => { if (pin.length < 4) setPin(p => p + d); };
  const backspace = () => setPin(p => p.slice(0, -1));

  const handlePinNext = () => {
    if (pin.length < 4) { shake(); setError("PIN must be at least 4 digits"); return; }
    setError(""); setMode("cashier-cash");
  };

  const handleCashierLogin = async () => {
    const res = loginCashier(pin, parseFloat(cash) || 0);
    if (!(await res).ok) { shake(); setError((await res).error || "Login failed"); }
  };

  const handleCookLogin = async () => {
    if (pin.length < 4) { shake(); setError("PIN must be at least 4 digits"); return; }
    const res = loginCook(pin);
    if (!(await res).ok) { shake(); setError((await res).error || "Login failed"); }
  };

  if (session) return <>{children}</>;

  const Logo = () => (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,var(--primary),#8B6010)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0C0C0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "Syne, sans-serif", letterSpacing: "0.04em", marginBottom: 4 }}>
        RESTO<span style={{ color: "var(--primary)" }}>POS</span>
      </h1>
    </div>
  );

  const PinDots = ({ length, color }: { length: number; color: string }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < length ? color : "var(--border)", border: `2px solid ${i < length ? color : "rgba(255,255,255,0.12)"}`, transition: "all 0.15s", boxShadow: i < length ? `0 0 8px ${color}80` : "none" }} />
      ))}
    </div>
  );

  const NumPad = ({ onDigit, onBack }: { onDigit: (d: string) => void; onBack: () => void }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
      {["1","2","3","4","5","6","7","8","9","*","0","⌫"].map(d => (
        <button key={d} onClick={() => d === "⌫" ? onBack() : d !== "*" ? onDigit(d) : undefined}
          style={{ padding: "16px", borderRadius: 12, border: "1px solid var(--input-border)", background: d === "⌫" ? "rgba(255,68,68,0.08)" : d === "*" ? "transparent" : "var(--input-bg)", color: d === "⌫" ? "#FF6B6B" : d === "*" ? "transparent" : "var(--text)", fontSize: d === "⌫" ? 18 : 20, fontWeight: 700, cursor: d === "*" ? "default" : "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.12s" }}>
          {d}
        </button>
      ))}
    </div>
  );

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif" }}>← Back</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "radial-gradient(ellipse at 30% 40%, #1a0d00 0%, #0C0C0C 60%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Sans', sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--primary-bg) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      <div style={{ position: "relative", borderRadius: 24, background: "var(--card-bg)", border: "1px solid rgba(212,160,23,0.2)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", overflow: "hidden", width: mode === "choose" ? 500 : 400, animation: shaking ? "shake 0.5s ease" : "none", transition: "width 0.3s ease" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,transparent,var(--primary),#F0C040,var(--primary),transparent)" }} />
        <div style={{ padding: "36px 40px 40px" }}>

          {/* ── CHOOSE ── */}
          {mode === "choose" && (
            <>
              <Logo />
              <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-dim)", letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", marginBottom: 28 }}>SELECT LOGIN TYPE</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {/* Admin / Super Admin */}
                <button onClick={() => { setMode("admin"); setError(""); }}
                  style={{ padding: "22px 16px", borderRadius: 16, border: "1px solid var(--primary-border)", background: "var(--primary-bg)", cursor: "pointer", transition: "all 0.18s", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-bg)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)", fontFamily: "Syne,sans-serif", letterSpacing: "0.04em", marginBottom: 2 }}>ADMIN</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", fontFamily: "Syne,sans-serif", opacity: 0.7, marginBottom: 4 }}>/ SUPER ADMIN</p>
                  <p style={{ fontSize: 14, color: "var(--text-dim)" }}>Email & Password</p>
                </button>
                {/* Cashier */}
                <button onClick={() => { setMode("cashier-pin"); setError(""); setPin(""); }}
                  style={{ padding: "22px 16px", borderRadius: 16, border: "1px solid rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.06)", cursor: "pointer", transition: "all 0.18s", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#60A5FA" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#60A5FA", fontFamily: "Syne,sans-serif", letterSpacing: "0.04em", marginBottom: 4 }}>CASHIER</p>
                  <p style={{ fontSize: 14, color: "var(--text-dim)" }}>4-digit PIN</p>
                </button>
                {/* Cook */}
                <button onClick={() => { setMode("cook-pin"); setError(""); setPin(""); }}
                  style={{ padding: "22px 16px", borderRadius: 16, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", cursor: "pointer", transition: "all 0.18s", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7L17 21H7l1.7-10.3A5 5 0 0112 2z" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#22C55E", fontFamily: "Syne,sans-serif", letterSpacing: "0.04em", marginBottom: 4 }}>COOK</p>
                  <p style={{ fontSize: 14, color: "var(--text-dim)" }}>Kitchen PIN</p>
                </button>
              </div>
              {/* <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
                Admin: admin@restopos.com / admin123 &nbsp;·&nbsp; Cashier PIN: 1234 &nbsp;·&nbsp; Cook PIN: 9999
              </p> */}
            </>
          )}

          {/* ── ADMIN ── */}
          {mode === "admin" && (
            <>
              <Logo />
              <p style={{ textAlign: "center", fontSize: 14, color: "var(--primary)", letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", marginBottom: 24 }}>🛡 ADMIN / SUPER ADMIN LOGIN</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Syne,sans-serif", display: "block", marginBottom: 6 }}>EMAIL ADDRESS</label>
                <input ref={inputRef} type="email" placeholder="admin@restopos.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                  style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 12, padding: "13px 14px", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Syne,sans-serif", display: "block", marginBottom: 6 }}>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                    style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 12, padding: "13px 44px 13px 14px", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d={showPw ? "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" : "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>{!showPw && <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>}</svg>
                  </button>
                </div>
              </div>
              {error && <p style={{ textAlign: "center", color: "#FF6B6B", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{error}</p>}
              <button onClick={handleAdminLogin} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "Syne,sans-serif", letterSpacing: "0.06em", background: "linear-gradient(135deg,var(--primary),#8B6010)", color: "var(--bg)", boxShadow: "0 4px 20px var(--primary-border)", marginBottom: 12 }}>SIGN IN AS ADMIN →</button>
              <BackBtn onClick={() => { setMode("choose"); setError(""); setEmail(""); setPassword(""); }} />
            </>
          )}

          {/* ── CASHIER PIN ── */}
          {mode === "cashier-pin" && (
            <>
              <Logo />
              <p style={{ textAlign: "center", fontSize: 14, color: "#60A5FA", letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", marginBottom: 20 }}>👤 CASHIER — ENTER PIN</p>
              <PinDots length={pin.length} color="#60A5FA" />
              <NumPad onDigit={appendPin} onBack={backspace} />
              {error && <p style={{ textAlign: "center", color: "#FF6B6B", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
              <button onClick={handlePinNext} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "Syne,sans-serif", letterSpacing: "0.06em", background: "linear-gradient(135deg,#60A5FA,#2563EB)", color: "white", boxShadow: "0 4px 20px rgba(96,165,250,0.3)", marginBottom: 10 }}>CONTINUE →</button>
              <BackBtn onClick={() => { setMode("choose"); setPin(""); setError(""); }} />
            </>
          )}

          {/* ── COOK PIN ── */}
          {mode === "cook-pin" && (
            <>
              <Logo />
              <p style={{ textAlign: "center", fontSize: 14, color: "#22C55E", letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", marginBottom: 20 }}>👨‍🍳 COOK — ENTER PIN</p>
              <PinDots length={pin.length} color="#22C55E" />
              <NumPad onDigit={appendPin} onBack={backspace} />
              {error && <p style={{ textAlign: "center", color: "#FF6B6B", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
              <button onClick={handleCookLogin} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "Syne,sans-serif", letterSpacing: "0.06em", background: "linear-gradient(135deg,#22C55E,#15803D)", color: "white", boxShadow: "0 4px 20px rgba(34,197,94,0.3)", marginBottom: 10 }}>ENTER KITCHEN →</button>
              <BackBtn onClick={() => { setMode("choose"); setPin(""); setError(""); }} />
            </>
          )}

          {/* ── CASHIER CASH ── */}
          {mode === "cashier-cash" && (
            <>
              <Logo />
              <p style={{ textAlign: "center", fontSize: 14, color: "#22C55E", letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", marginBottom: 20 }}>💰 ENTER OPENING CASH</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Syne,sans-serif", display: "block", marginBottom: 8 }}>OPENING CASH (SR)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "var(--primary)", fontFamily: "Syne,sans-serif" }}>SR</span>
                  <input ref={inputRef} type="number" min="0" placeholder="0.00" value={cash} onChange={e => setCash(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCashierLogin()}
                    style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--primary-border)", borderRadius: 12, padding: "14px 16px 14px 60px", color: "var(--text)", fontSize: 20, fontWeight: 800, outline: "none", fontFamily: "Syne,sans-serif", boxSizing: "border-box" }} />
                </div>
              </div>
              {/* Cash breakdown */}
              <div style={{ marginBottom: 18, border: "1px solid var(--border)", borderRadius: 18, padding: 14, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.08em", margin: 0, fontFamily: "Syne,sans-serif" }}>CASH BREAKDOWN</p>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)", fontFamily: "Syne,sans-serif" }}>SR {breakdownTotal}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  {DENOMINATIONS.map(note => (
                    <div key={note} style={{ display: "flex", alignItems: "center", height: 30, padding: "0 14px", borderRadius: 14, background: "var(--input-bg)", border: "1px solid var(--border)", boxSizing: "border-box" }}>
                      <div style={{ minWidth: 46, fontSize: 14, fontWeight: 700, color: "var(--primary)", fontFamily: "Syne,sans-serif" }}>{note}</div>
                      <span style={{ opacity: 0.45, marginRight: 10, color: "var(--text-dim)", fontWeight: 700 }}>×</span>
                      <input type="number" min="0" value={cashBreakdown[note] || ""} placeholder="0"
                        onChange={e => {
                          const val = e.target.value;
                          setCashBreakdown(prev => {
                            const updated = { ...prev, [note]: val };
                            const total = DENOMINATIONS.reduce((sum, n) => sum + n * Number(updated[n] || 0), 0);
                            setCash(String(total));
                            return updated;
                          });
                        }}
                        style={{ width: 42, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif" }} />
                      <div style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "var(--text-dim)", fontFamily: "Syne,sans-serif" }}>
                        {Number(cashBreakdown[note] || 0) > 0 ? `SR ${Number(cashBreakdown[note]) * note}` : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <p style={{ textAlign: "center", color: "#FF6B6B", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setMode("cashier-pin"); setError(""); }}
                  style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid var(--input-border)", background: "transparent", color: "var(--text-dim)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif" }}>← BACK</button>
                <button onClick={handleCashierLogin}
                  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "Syne,sans-serif", letterSpacing: "0.06em", background: "linear-gradient(135deg,var(--primary),#8B6010)", color: "var(--bg)", boxShadow: "0 4px 20px var(--primary-border)" }}>OPEN SHIFT ✓</button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}
