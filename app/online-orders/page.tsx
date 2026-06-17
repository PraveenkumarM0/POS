"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import api from "@/lib/api";

type Platform = "Zomato" | "Swiggy" | "Keeta" | "HungerStation";
type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";

interface OnlineOrder {
  id: string;
  platform: Platform;
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: OrderStatus;
  time: string;
  address: string;
  eta: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<OrderStatus, { label: string; emoji: string; color: string; bg: string; next: OrderStatus | null; nextLabel: string; endpoint: string | null }> = {
  new:       { label: "New",       emoji: "", color: "#60A5FA", bg: "rgba(96,165,250,0.15)",  next: "preparing", nextLabel: "Start Preparing",  endpoint: "start-preparing" },
  preparing: { label: "Preparing", emoji: "", color: "#FBBF24", bg: "rgba(251,191,36,0.15)",  next: "ready",     nextLabel: "Mark Ready",        endpoint: "mark-ready" },
  ready:     { label: "Ready",     emoji: "",  color: "#22C55E", bg: "rgba(34,197,94,0.15)",   next: "delivered", nextLabel: "Mark Delivered",    endpoint: "mark-delivered" },
  delivered: { label: "Delivered", emoji: "",  color: "#888880", bg: "rgba(136,136,128,0.12)", next: null,        nextLabel: "",                  endpoint: null },
  cancelled: { label: "Cancelled", emoji: "",  color: "#FF4444", bg: "rgba(255,68,68,0.12)",   next: null,        nextLabel: "",                  endpoint: null },
};

// ── Platform config — keeps your real logo images ─────────────────────────────
const PLATFORM_CFG: Record<Platform, { color: string; bg: string; backendKey: string; logo: (sz: number) => JSX.Element }> = {
  Zomato: {
    color: "#E13737", bg: "rgba(225,55,55,0.1)", backendKey: "zomato",
    logo: (sz) => (
      <img src="/images/[CITYPNG.COM]Zomato Logo Transparent Background - 3000x3000 1.png" alt="Zomato" width={70} height={50}
        style={{ objectFit: "contain", borderRadius: 8, display: "block", flexShrink: 0 }} />
    ),
  },
  Swiggy: {
    color: "#FC8019", bg: "rgba(252,128,25,0.1)", backendKey: "swiggy",
    logo: (sz) => (
      <img src="/images/pngwing.com 1.png" alt="Swiggy" width={70} height={50}
        style={{ objectFit: "contain", borderRadius: 8, display: "block", flexShrink: 0 }} />
    ),
  },
  Keeta: {
    color: "#00B14F", bg: "rgba(0,177,79,0.1)", backendKey: "keeta",
    logo: (sz) => (
      <img src="/images/Keeta-02 1.png" alt="Keeta" width={70} height={50}
        style={{ objectFit: "contain", borderRadius: 8, display: "block", flexShrink: 0 }} />
    ),
  },
  HungerStation: {
    color: "#FF6B00", bg: "rgba(255,107,0,0.1)", backendKey: "hungerstation",
    logo: (sz) => (
      <img src="/images/hungerstation-logo-png_seeklogo-451169 1.png" alt="HungerStation" width={70} height={50}
        style={{ objectFit: "contain", borderRadius: 8, display: "block", flexShrink: 0 }} />
    ),
  },
};

// backend platform key → Platform label
const PLATFORM_MAP: Record<string, Platform> = {
  zomato: "Zomato", swiggy: "Swiggy", keeta: "Keeta", hungerstation: "HungerStation",
};

const ALL_PLATFORMS: Platform[] = ["Zomato", "Swiggy", "Keeta", "HungerStation"];

// Map a raw backend order to OnlineOrder
function mapOrder(o: Record<string, any>): OnlineOrder {
  const backendStatus = o.status as string;
  const uiStatus: OrderStatus = backendStatus === "pending" ? "new" : backendStatus as OrderStatus;
  return {
    id:       o._id,
    platform: PLATFORM_MAP[o.externalPlatform] ?? "Zomato",
    customer: o.customerInfo?.name  ?? "—",
    phone:    o.customerInfo?.phone ?? "",
    address:  o.customerInfo?.address ?? "",
    items:    (o.items ?? []).map((i: any) => ({
      name:  i.menuItem?.name ?? "Unknown item",
      qty:   i.quantity,
      price: i.price,
    })),
    total:  o.totalAmount,
    status: uiStatus,
    time:   new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    eta:    "—",
  };
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, color }: { on: boolean; onChange: () => void; color: string }) {
  return (
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: on ? color : "var(--input-bg)", border: `1px solid ${on ? color : "var(--border)"}`, cursor: "pointer", position: "relative", transition: "all 0.25s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: on ? "white" : "var(--text-dim)", transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OnlineOrdersPage() {
  const [orders,   setOrders]   = useState<OnlineOrder[]>([]);
  const [selected, setSelected] = useState<OnlineOrder | null>(null);
  const [filter,   setFilter]   = useState<OrderStatus | "all">("all");
  const [enabled,  setEnabled]  = useState<Record<Platform, boolean>>({ Zomato: true, Swiggy: true, Keeta: true, HungerStation: true });
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Load orders + platform states ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, platRes] = await Promise.all([
        api.get("/online/orders"),
        api.get("/online/platforms"),
      ]);
      const rawOrders: Record<string, any>[] = ordRes.data?.data?.orders ?? [];
      setOrders(rawOrders.map(mapOrder));

      const platforms: Record<string, any>[] = platRes.data?.data ?? [];
      const en = { ...enabled };
      platforms.forEach((p) => {
        const key = PLATFORM_MAP[p.platform];
        if (key) en[key] = p.isActive;
      });
      setEnabled(en);
    } catch { /* backend offline — keep empty list */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Advance order status ──
  const advance = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const cfg = STATUS_CFG[order.status];
    if (!cfg.endpoint) return;
    setActing(true);
    try {
      await api.patch(`/online/orders/${id}/${cfg.endpoint}`);
      const next = cfg.next!;
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: next } : o));
      setSelected((prev) => prev?.id === id ? { ...prev, status: next } : prev);
    } catch { /* show nothing — optimistic not applied */ }
    setActing(false);
  };

  // ── Cancel order ──
  const cancelOrder = async (id: string) => {
    setActing(true);
    try {
      await api.patch(`/online/orders/${id}/cancel`, { reason: "Cancelled from dashboard" });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o));
      setSelected((prev) => prev?.id === id ? { ...prev, status: "cancelled" } : prev);
    } catch { /* ignore */ }
    setActing(false);
  };

  // ── Toggle platform ──
  const togglePlatform = async (platform: Platform) => {
    const key = PLATFORM_CFG[platform].backendKey;
    try {
      await api.patch(`/online/platforms/${key}/toggle`);
    } catch { /* if backend call fails, still toggle locally */ }
    setEnabled((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const visibleOrders = orders.filter((o) => (filter === "all" || o.status === filter) && enabled[o.platform]);

  const counts = {
    all:       orders.length,
    new:       orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready:     orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── LEFT: controls + list ── */}
      <div style={{ width: isMobile ? "100%" : "min(720px, 100%)", display: isMobile && selected ? "none" : "flex", flexDirection: "column", borderRight: "1px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary-bg)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛵</div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", fontFamily: "Syne,sans-serif", margin: 0 }}>Online Orders</h1>
              <p style={{ fontSize: 14, color: "var(--text-dim)", margin: 0 }}>Live delivery dashboard</p>
            </div>
            {counts.new > 0 && (
              <div style={{ background: "var(--primary)", color: "white", fontSize: 14, fontWeight: 800, padding: "2px 8px", borderRadius: 20, fontFamily: "Syne,sans-serif", marginLeft: "auto" }}>{counts.new} NEW</div>
            )}
            <button onClick={loadData} style={{ marginLeft: counts.new > 0 ? 6 : "auto", padding: "10px 14px", minHeight: 40, borderRadius: 7, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text-dim)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif" }}>↻ Refresh</button>
          </div>

          {/* Platform toggles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
            {ALL_PLATFORMS.map((p) => {
              const cfg = PLATFORM_CFG[p];
              const on  = enabled[p];
              return (
                <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${on ? cfg.color + "50" : "var(--border)"}`, background: on ? cfg.bg : "var(--input-bg)", transition: "all 0.25s", opacity: on ? 1 : 0.55 }}>
                  <div style={{ opacity: on ? 1 : 0.35, flexShrink: 0 }}>{cfg.logo(32)}</div>
                  <Toggle on={on} onChange={() => togglePlatform(p)} color={cfg.color} />
                </div>
              );
            })}
          </div>

          {/* Status filter tabs */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(["all", "new", "preparing", "ready", "delivered", "cancelled"] as const).map((s) => {
              const cfg = s !== "all" ? STATUS_CFG[s] : null;
              return (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px", minHeight: 40, borderRadius: 20, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "Syne,sans-serif", transition: "all 0.15s", background: filter === s ? (cfg ? cfg.color : "var(--primary)") : "var(--input-bg)", color: filter === s ? "white" : "var(--text-dim)" }}>
                  {cfg && <span style={{ fontSize: 14 }}>{cfg.emoji}</span>}
                  {s === "all" ? "ALL" : STATUS_CFG[s].label.toUpperCase()}
                  <span style={{ fontSize: 14, fontWeight: 800, padding: "1px 4px", borderRadius: 4, background: "rgba(0,0,0,0.2)", minWidth: 14, textAlign: "center" }}>{counts[s]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Order list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 60, opacity: 0.4 }}>
              <span style={{ fontSize: 30 }}>⏳</span>
              <p style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "Syne,sans-serif" }}>Loading orders…</p>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 40, opacity: 0.35 }}>
              <span style={{ fontSize: 30 }}>📭</span>
              <p style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "Syne,sans-serif" }}>No orders found</p>
            </div>
          ) : visibleOrders.map((order, i) => {
            const pcfg  = PLATFORM_CFG[order.platform];
            const scfg  = STATUS_CFG[order.status];
            const isSel = selected?.id === order.id;
            return (
              <div key={order.id} onClick={() => setSelected(isSel ? null : order)}
                style={{ marginBottom: 8, background: isSel ? "var(--surface)" : "var(--card-bg)", borderRadius: 12, border: `1.5px solid ${isSel ? scfg.color : "var(--border)"}`, cursor: "pointer", overflow: "hidden", transition: "all 0.18s", boxShadow: isSel ? `0 4px 20px ${scfg.color}25` : "none" }}>
                <div style={{ height: 2, background: pcfg.color, opacity: 0.7 }} />
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flexShrink: 0 }}>{pcfg.logo(36)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", fontFamily: "Syne,sans-serif" }}>{order.id}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: scfg.color, padding: "1px 7px", borderRadius: 20, background: scfg.bg }}>{scfg.emoji} {scfg.label.toUpperCase()}</span>
                        <span style={{ fontSize: 14, color: "var(--text-dim)", marginLeft: "auto" }}>{order.time}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 1px" }}>{order.customer}</p>
                      <p style={{ fontSize: 14, color: "var(--text-dim)", margin: 0 }}>📍 {order.address || "No address"}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)", fontFamily: "Syne,sans-serif", margin: 0 }}>SR {order.total}</p>
                      {scfg.next && (
                        <button onClick={(e) => { e.stopPropagation(); advance(order.id); }} disabled={acting}
                          style={{ padding: "10px 12px", minHeight: 40, borderRadius: 7, border: `1px solid ${scfg.color}50`, background: scfg.bg, color: scfg.color, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Syne,sans-serif", whiteSpace: "nowrap" }}>
                          {scfg.nextLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    {order.items.slice(0, 4).map((item, j) => (
                      <span key={j} style={{ fontSize: 14, color: "var(--text-muted)", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>{item.qty}× {item.name}</span>
                    ))}
                    {order.items.length > 4 && <span style={{ fontSize: 14, color: "var(--text-dim)", padding: "2px 5px" }}>+{order.items.length - 4} more</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: detail panel ── */}
      <div style={{ flex: 1, display: isMobile && !selected ? "none" : "flex", flexDirection: "column", overflow: "hidden", width: isMobile ? "100%" : undefined }}>
        {selected ? (() => {
          const pcfg = PLATFORM_CFG[selected.platform];
          const scfg = STATUS_CFG[selected.status];
          return (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ background: pcfg.bg, borderBottom: `1px solid ${pcfg.color}30`, padding: "14px 20px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isMobile && (
                      <button onClick={() => setSelected(null)} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    {pcfg.logo(36)}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 900, color: pcfg.color, fontFamily: "Syne,sans-serif", margin: 0 }}>{selected.platform}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", fontFamily: "Syne,sans-serif", margin: 0 }}>{selected.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: scfg.bg, border: `1px solid ${scfg.color}40`, borderRadius: 20, padding: "4px 12px" }}>
                  <span style={{ fontSize: 14 }}>{scfg.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: scfg.color, fontFamily: "Syne,sans-serif" }}>{scfg.label.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Customer */}
                <div style={{ background: "var(--surface)", borderRadius: 12, padding: "14px", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", margin: "0 0 10px" }}>👤 CUSTOMER</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 5px" }}>{selected.customer}</p>
                  {selected.phone && <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 4px" }}>📞 {selected.phone}</p>}
                  {selected.address && <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.4 }}>📍 {selected.address}</p>}
                </div>

                {/* Items */}
                <div>
                  <p style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Syne,sans-serif", margin: "0 0 8px" }}>🧾 ITEMS ({selected.items.reduce((s, i) => s + i.qty, 0)})</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {selected.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--primary-bg)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)", fontFamily: "Syne,sans-serif" }}>{item.qty}×</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>SR {(item.price * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 14, color: "var(--text-muted)", letterSpacing: "0.08em", fontFamily: "Syne,sans-serif", margin: 0 }}>ORDER TOTAL</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", fontFamily: "Syne,sans-serif", margin: 0 }}>SR {selected.total}</p>
                  </div>
                  <span style={{ fontSize: 28 }}>💳</span>
                </div>

                {/* Advance button */}
                {scfg.next && (
                  <button onClick={() => advance(selected.id)} disabled={acting}
                    style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: acting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, fontFamily: "Syne,sans-serif", letterSpacing: "0.06em", background: `linear-gradient(135deg,${scfg.color},${scfg.color}AA)`, color: "white", boxShadow: `0 4px 20px ${scfg.color}40`, opacity: acting ? 0.7 : 1 }}>
                    {STATUS_CFG[scfg.next].emoji} {scfg.nextLabel.toUpperCase()} →
                  </button>
                )}

                {/* Cancel button */}
                {selected.status !== "delivered" && selected.status !== "cancelled" && (
                  <button onClick={() => cancelOrder(selected.id)} disabled={acting}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "#FF4444", cursor: acting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "Syne,sans-serif" }}>
                    Cancel Order
                  </button>
                )}

                {selected.status === "delivered" && (
                  <div style={{ textAlign: "center", padding: "14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12 }}>
                    <p style={{ fontSize: 20, margin: "0 0 4px" }}>🎉</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#22C55E", fontFamily: "Syne,sans-serif", margin: 0 }}>ORDER DELIVERED</p>
                  </div>
                )}
                {selected.status === "cancelled" && (
                  <div style={{ textAlign: "center", padding: "14px", background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 12 }}>
                    <p style={{ fontSize: 20, margin: "0 0 4px" }}>❌</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#FF4444", fontFamily: "Syne,sans-serif", margin: 0 }}>ORDER CANCELLED</p>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.3 }}>
            <span style={{ fontSize: 48 }}>🛵</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dim)", fontFamily: "Syne,sans-serif" }}>Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
