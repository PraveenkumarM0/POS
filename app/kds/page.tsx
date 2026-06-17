'use client';
import { useState, useEffect, useCallback } from 'react';
import './kds.css';
import api from '@/lib/api';

/* ── Types ── */
type KDSStatus = 'new' | 'preparing' | 'ready';
type ItemStatus = 'pending' | 'preparing' | 'ready' | 'done';
type KDSSource = 'Dine In' | 'Takeaway' | 'Delivery' | 'Zomato' | 'Swiggy';

interface KDSItem {
  itemId: string;
  name: string;
  variant?: string;
  qty: number;
  notes?: string;
  itemStatus: ItemStatus;
}

interface KDSTicket {
  id: string;
  orderNum: string;
  source: KDSSource;
  table?: number;
  items: KDSItem[];
  status: KDSStatus;
  createdAt: number;
  priority: 'normal' | 'rush';
  extraItems?: string[];
}

/* ── Status mappings ── */
const ITEM_STATUS_FROM_API: Record<string, ItemStatus> = {
  new: 'pending', preparing: 'preparing', ready: 'ready', completed: 'done',
};
const ITEM_STATUS_TO_API: Record<ItemStatus, string> = {
  pending: 'new', preparing: 'preparing', ready: 'ready', done: 'completed',
};
const ORDER_TYPE_TO_SOURCE: Record<string, KDSSource> = {
  dine_in: 'Dine In', takeaway: 'Takeaway', delivery: 'Delivery',
};

function mapApiOrder(o: any): KDSTicket {
  return {
    id: o._id,
    orderNum: `#${o.posOrderNumber ?? o._id.slice(-4)}`,
    source: ORDER_TYPE_TO_SOURCE[o.orderType] ?? 'Dine In',
    table: o.table?.tableNumber ?? undefined,
    status: (o.kdsStatus ?? 'new') as KDSStatus,
    priority: o.isRush ? 'rush' : 'normal',
    createdAt: new Date(o.createdAt).getTime(),
    items: (o.items ?? []).map((i: any) => ({
      itemId: i._id,
      name: i.name,
      variant: i.variant?.label ?? i.variantLabel ?? i.selectedVariant ?? i.variantName ?? undefined,
      qty: i.quantity,
      notes: i.note || undefined,
      itemStatus: ITEM_STATUS_FROM_API[i.kdsStatus ?? 'new'] ?? 'pending',
    })),
  };
}

const SOURCE_CFG: Record<KDSSource, { color: string; icon: string }> = {
  'Dine In':  { color: 'var(--primary)', icon: '🍽️' },
  'Takeaway': { color: '#A78BFA',        icon: '🛍️' },
  'Delivery': { color: '#FBBF24',        icon: '🛵' },
  'Zomato':   { color: '#E13737',        icon: '🔴' },
  'Swiggy':   { color: '#FC8019',        icon: '🟠' },
};

type OrderFilter = 'All' | 'Dine In' | 'Takeaway' | 'Online';

const PAGE_SIZE = 5;

function useTimer() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function elapsed(createdAt: number) {
  const diff = Math.floor((Date.now() - createdAt) / 1000);
  return {
    mins: Math.floor(diff / 60),
    secs: diff % 60,
    urgent:   Math.floor(diff / 60) >= 10,
    critical: Math.floor(diff / 60) >= 15,
  };
}

function TimerBadge({ createdAt }: { createdAt: number }) {
  useTimer();
  const { mins, secs, urgent, critical } = elapsed(createdAt);
  const color = critical ? '#FF4444' : urgent ? '#FBBF24' : '#22C55E';
  return (
    <div className="kds-timer" style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10, padding: '4px 10px' }}>
      <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'monospace' }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}

const STATUS_COLUMNS: { key: KDSStatus; label: string; color: string }[] = [
  { key: 'new',       label: 'NEW ORDERS', color: '#60A5FA' },
  { key: 'preparing', label: 'PREPARING',  color: '#FBBF24' },
  { key: 'ready',     label: 'READY',      color: '#22C55E' },
];

const ITEM_STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  pending:   'preparing',
  preparing: 'ready',
  ready:     'done',
  done:      'pending',
};

const ITEM_STATUS_COLOR: Record<ItemStatus, string> = {
  pending:   'var(--text-dim)',
  preparing: '#FBBF24',
  ready:     '#22C55E',
  done:      '#60A5FA',
};

const ITEM_STATUS_BG: Record<ItemStatus, string> = {
  pending:   'var(--input-bg)',
  preparing: 'rgba(251,191,36,0.12)',
  ready:     'rgba(34,197,94,0.12)',
  done:      'rgba(96,165,250,0.12)',
};

const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending:   '○ Pending',
  preparing: '⏳ Preparing',
  ready:     '✓ Ready',
  done:      '✓ Done',
};

/* ── Item Status Popup ── */
function ItemStatusPopup({ item, ticketNum, onClose, onUpdate }: {
  item: KDSItem & { idx: number };
  ticketNum: string;
  onClose: () => void;
  onUpdate: (idx: number, status: ItemStatus) => void;
}) {
  const statuses: ItemStatus[] = ['pending', 'preparing', 'ready', 'done'];
  return (
    <div className="kds-popup-overlay" onClick={onClose}>
      <div className="kds-popup anim-scale" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div className="kds-popup-header">
          <h2 className="kds-popup-title">Update Item Status</h2>
          <button className="kds-popup-close" onClick={onClose}>✕</button>
        </div>
        <div className="kds-popup-body">
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: '0 0 4px' }}>
              {ticketNum}
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>
              {item.qty}× {item.name}
            </p>
            {item.variant && (
              <p style={{ fontSize: 13, color: '#A78BFA', fontWeight: 700, margin: '3px 0 0', fontFamily: 'Syne,sans-serif' }}>▸ {item.variant}</p>
            )}
            {item.notes && <p style={{ fontSize: 14, color: '#FBBF24', margin: '4px 0 0' }}>⚠ {item.notes}</p>}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: '0 0 10px' }}>SELECT STATUS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {statuses.map(s => (
              <button key={s}
                onClick={() => { onUpdate(item.idx, s); onClose(); }}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  border: `1.5px solid ${item.itemStatus === s ? ITEM_STATUS_COLOR[s] : 'var(--border)'}`,
                  background: item.itemStatus === s ? ITEM_STATUS_BG[s] : 'var(--input-bg)',
                  color: item.itemStatus === s ? ITEM_STATUS_COLOR[s] : 'var(--text-dim)',
                  fontSize: 14, fontWeight: item.itemStatus === s ? 800 : 600, fontFamily: 'Syne,sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                {ITEM_STATUS_LABEL[s]}
                {item.itemStatus === s && <span style={{ fontSize: 11 }}>● CURRENT</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Order Popup ── */
function OrderPopup({ ticket, onClose, onAdvance, onBump, onAddExtra, onItemStatusChange }: {
  ticket: KDSTicket;
  onClose: () => void;
  onAdvance: () => void;
  onBump: () => void;
  onAddExtra: (text: string, category?: string) => void;
  onItemStatusChange: (ticketId: string, idx: number, status: ItemStatus) => void;
}) {
  const [extraText, setExtraText] = useState('');
  const [extraCategory, setExtraCategory] = useState('');
  const src = SOURCE_CFG[ticket.source];
  const doneCount  = ticket.items.filter(i => i.itemStatus === 'done').length;
  const allDone    = doneCount === ticket.items.length;
  const readyCount = ticket.items.filter(i => i.itemStatus === 'ready' || i.itemStatus === 'done').length;
  const readyPct   = ticket.items.length > 0 ? (readyCount / ticket.items.length) * 100 : 0;

  return (
    <div className="kds-popup-overlay" onClick={onClose}>
      <div className="kds-popup anim-scale" onClick={e => e.stopPropagation()}>
        <div className="kds-popup-header">
          <h2 className="kds-popup-title">{src.icon} {ticket.orderNum}</h2>
          <button className="kds-popup-close" onClick={onClose}>✕</button>
        </div>
        <div className="kds-popup-body">
          <div className="kds-popup-meta">
            <span className="kds-popup-badge" style={{ background: `${src.color}18`, color: src.color, border: `1px solid ${src.color}40` }}>
              {ticket.source}
            </span>
            {ticket.table && (
              <span className="kds-popup-badge" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                Table {ticket.table}
              </span>
            )}
            {ticket.priority === 'rush' && (
              <span className="kds-popup-badge" style={{ background: 'rgba(255,68,68,0.12)', color: '#FF4444', border: '1px solid rgba(255,68,68,0.3)' }}>🔥 RUSH</span>
            )}
            <span className="kds-popup-badge" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 0 }}>
              <TimerBadge createdAt={ticket.createdAt} />
            </span>
          </div>

          {/* Readiness */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'Syne,sans-serif' }}>PROGRESS</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: allDone ? '#60A5FA' : readyCount === ticket.items.length ? '#22C55E' : '#FBBF24' }}>
                {doneCount}/{ticket.items.length} done
              </span>
            </div>
            <div className="kds-readiness-bar">
              <div className="kds-readiness-fill" style={{ width: `${readyPct}%`, background: allDone ? '#60A5FA' : readyPct === 100 ? '#22C55E' : '#FBBF24' }} />
            </div>
          </div>

          <p className="kds-popup-items-label">ORDERED ITEMS — Click item to update status</p>
          {ticket.items.map((item, idx) => (
            <div key={idx} className="kds-popup-item" style={{ cursor: 'pointer' }}
              onClick={() => {
                const next = ITEM_STATUS_CYCLE[item.itemStatus];
                onItemStatusChange(ticket.id, idx, next);
              }}>
              <div className="kds-popup-item-qty">{item.qty}</div>
              <div style={{ flex: 1 }}>
                <p className="kds-popup-item-name">{item.name}</p>
                {item.variant && (
                  <p style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, margin: '2px 0 2px', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em' }}>
                    ▸ {item.variant}
                  </p>
                )}
                {item.notes && <p className="kds-popup-item-notes">⚠ {item.notes}</p>}
                <span style={{ fontSize: 14, color: ITEM_STATUS_COLOR[item.itemStatus], fontWeight: 700, fontFamily: 'Syne,sans-serif', textTransform: 'uppercase' }}>
                  {ITEM_STATUS_LABEL[item.itemStatus]}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 14, color: ITEM_STATUS_COLOR[item.itemStatus], background: ITEM_STATUS_BG[item.itemStatus], padding: '2px 7px', borderRadius: 5, border: `1px solid ${ITEM_STATUS_COLOR[item.itemStatus]}40` }}>
                  tap to advance
                </span>
              </div>
            </div>
          ))}

          {/* Extra items */}
          {ticket.extraItems && ticket.extraItems.length > 0 && (
            <div className="kds-popup-extra-section">
              <p className="kds-popup-extra-label">EXTRA ITEMS</p>
              {ticket.extraItems.map((ex, i) => (
                <div key={i} className="kds-popup-extra-item"><span>• {ex}</span></div>
              ))}
            </div>
          )}

          {/* Add extra item (Dine In only) */}
          {ticket.source === 'Dine In' && (
            <div className="kds-popup-extra-section">
              <p className="kds-popup-extra-label">ADD EXTRA NOTE</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input className="kds-popup-extra-input" placeholder="Category (e.g. Drinks, Starters)"
                  value={extraCategory} onChange={e => setExtraCategory(e.target.value)} style={{ marginBottom: 0 }} />
                <div className="kds-popup-extra-add">
                  <input className="kds-popup-extra-input" placeholder="e.g. Extra sauce, side salad…" value={extraText}
                    onChange={e => setExtraText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && extraText.trim()) {
                        onAddExtra(extraText.trim(), extraCategory.trim());
                        setExtraText('');
                        setExtraCategory('');
                      }
                    }} />
                  <button className="kds-popup-extra-btn" onClick={() => {
                    if (extraText.trim()) {
                      onAddExtra(extraText.trim(), extraCategory.trim());
                      setExtraText('');
                      setExtraCategory('');
                    }
                  }}>+ Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="kds-popup-actions">
            {allDone ? (
              <button className="kds-popup-action-btn" onClick={onBump}
                style={{ background: 'linear-gradient(135deg,#60A5FA,#2563EB)', color: '#fff' }}>
                ✓ MARK ORDER COMPLETED
              </button>
            ) : ticket.status !== 'ready' ? (
              <button className="kds-popup-action-btn" onClick={onAdvance}
                style={{ background: ticket.status === 'new' ? 'linear-gradient(135deg,#FBBF24,#D97706)' : 'linear-gradient(135deg,#22C55E,#15803D)', color: '#fff' }}>
                {ticket.status === 'new' ? 'START COOKING' : 'MARK READY'}
              </button>
            ) : (
              <button className="kds-popup-action-btn" onClick={onBump}
                style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: '#fff' }}>
                COMPLETE ORDER ✓
              </button>
            )}
            <button className="kds-popup-action-btn" onClick={onClose}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', flex: 'unset', padding: '12px 20px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function KDSPage() {
  const [tickets, setTickets]               = useState<KDSTicket[]>([]);
  const [loading, setLoading]               = useState(true);
  const [orderFilter, setOrderFilter]       = useState<OrderFilter>('All');
  const [page, setPage]                     = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedItemPopup, setSelectedItemPopup] = useState<{ ticketId: string; itemIdx: number } | null>(null);

  /* ── Load tickets from backend ── */
  const loadTickets = useCallback(async () => {
    try {
      const res = await api.get('/orders/kds/active');
      const orders: any[] = res.data?.data ?? [];
      setTickets(orders.map(mapApiOrder));
    } catch {
      /* keep existing tickets on network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 15_000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  /* ── Advance order status ── */
  const advance = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const next: KDSStatus = ticket.status === 'new' ? 'preparing' : 'ready';
    setTickets(prev => prev.map(t => t.id !== id ? t : { ...t, status: next }));
    try {
      await api.patch(`/orders/${id}/kds-status`, { kdsStatus: next });
    } catch {
      loadTickets();
    }
  };

  /* ── Complete and remove ticket ── */
  const bump = async (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setSelectedTicket(null);
    try {
      await api.patch(`/orders/${id}/kds-status`, { kdsStatus: 'completed' });
    } catch {
      loadTickets();
    }
  };

  /* ── Update individual item kds status ── */
  const setItemStatus = async (ticketId: string, itemIdx: number, status: ItemStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const item = ticket.items[itemIdx];
    if (!item) return;

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const newItems = t.items.map((it, i) => i === itemIdx ? { ...it, itemStatus: status } : it);
      const allDone  = newItems.every(i => i.itemStatus === 'done');
      const allReady = newItems.every(i => i.itemStatus === 'ready' || i.itemStatus === 'done');
      return { ...t, items: newItems, status: allDone || allReady ? 'ready' : t.status };
    }));

    try {
      await api.patch(`/orders/${ticketId}/items/${item.itemId}/kds-status`, {
        kdsStatus: ITEM_STATUS_TO_API[status],
      });
    } catch {
      loadTickets();
    }
  };

  const addExtra = (ticketId: string, text: string, category?: string) => {
    const entry = category ? `[${category}] ${text}` : text;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, extraItems: [...(t.extraItems || []), entry] } : t));
  };

  const applyFilter = (t: KDSTicket) => {
    if (orderFilter === 'All')      return true;
    if (orderFilter === 'Dine In')  return t.source === 'Dine In';
    if (orderFilter === 'Takeaway') return t.source === 'Takeaway';
    if (orderFilter === 'Online')   return ['Delivery', 'Zomato', 'Swiggy'].includes(t.source);
    return true;
  };

  const filteredTickets   = tickets.filter(applyFilter);
  const getColTickets     = (status: KDSStatus) => filteredTickets.filter(t => t.status === status);
  const allActiveFiltered = filteredTickets.filter(t => t.status !== 'ready');
  const totalPages        = Math.max(1, Math.ceil(allActiveFiltered.length / PAGE_SIZE));
  const currentPage       = Math.min(page, totalPages);

  const paginateCol = (status: KDSStatus) => {
    if (status === 'ready') return getColTickets('ready');
    const all   = allActiveFiltered;
    const start = (currentPage - 1) * PAGE_SIZE;
    return all.slice(start, start + PAGE_SIZE).filter(t => t.status === status);
  };

  const filterCounts: Record<OrderFilter, number> = {
    'All':      tickets.length,
    'Dine In':  tickets.filter(t => t.source === 'Dine In').length,
    'Takeaway': tickets.filter(t => t.source === 'Takeaway').length,
    'Online':   tickets.filter(t => ['Delivery', 'Zomato', 'Swiggy'].includes(t.source)).length,
  };

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);
  const totalActive        = tickets.filter(t => t.status !== 'ready').length;

  const itemPopupTicket = selectedItemPopup ? tickets.find(t => t.id === selectedItemPopup.ticketId) : null;
  const itemPopupItem   = itemPopupTicket ? itemPopupTicket.items[selectedItemPopup!.itemIdx] : null;

  return (
    <div className="kds-root">
      {/* Header */}
      <div className="kds-header">
        <div className="kds-header-left">
          <div className="kds-header-icon">🖥️</div>
          <div>
            <h1 className="kds-header-title">Kitchen Display</h1>
            <p className="kds-header-sub">LIVE KITCHEN ORDERS</p>
          </div>
        </div>
        <div className="kds-header-right">
          <button
            onClick={loadTickets}
            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}
          >
            ↻ Refresh
          </button>
          <div className="kds-stat-card" style={{ background: 'var(--primary)15', border: '1px solid var(--primary)40' }}>
            <span className="kds-stat-label">ACTIVE</span>
            <span className="kds-stat-value" style={{ color: 'var(--primary)' }}>{totalActive}</span>
          </div>
          <div className="kds-stat-card" style={{ background: '#22C55E15', border: '1px solid #22C55E40' }}>
            <span className="kds-stat-label">READY</span>
            <span className="kds-stat-value" style={{ color: '#22C55E' }}>{tickets.filter(t => t.status === 'ready').length}</span>
          </div>
          <div className="kds-stat-card" style={{ background: '#FBBF2415', border: '1px solid #FBBF2440' }}>
            <span className="kds-stat-label">PREPARING</span>
            <span className="kds-stat-value" style={{ color: '#FBBF24' }}>{tickets.filter(t => t.status === 'preparing').length}</span>
          </div>
        </div>
      </div>

      {/* Order type filters */}
      <div className="kds-filters">
        {(['All', 'Dine In', 'Takeaway', 'Online'] as OrderFilter[]).map(f => {
          const isActive = orderFilter === f;
          const color = f === 'All' ? 'var(--primary)' : f === 'Dine In' ? 'var(--primary)' : f === 'Takeaway' ? '#A78BFA' : '#FBBF24';
          return (
            <button key={f} className={'kds-filter-btn' + (isActive ? ' active' : '')}
              style={{ borderColor: isActive ? color : undefined, background: isActive ? `${color}18` : undefined, color: isActive ? color : undefined }}
              onClick={() => { setOrderFilter(f); setPage(1); }}>
              {f}
              <span style={{ background: isActive ? `${color}30` : undefined }}>{filterCounts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* Columns */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 14 }}>
          Loading kitchen orders…
        </div>
      ) : (
        <div className="kds-columns">
          {STATUS_COLUMNS.map((col, colIdx) => {
            const colTickets = paginateCol(col.key);
            return (
              <div key={col.key} className="kds-column" style={{ borderRight: colIdx !== STATUS_COLUMNS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="kds-column-header" style={{ background: `${col.color}10` }}>
                  <span className="kds-column-label" style={{ color: col.color }}>{col.label}</span>
                  <div className="kds-column-badge" style={{ background: col.color }}>
                    <span>{getColTickets(col.key).length}</span>
                  </div>
                </div>
                <div className="kds-column-body">
                  {colTickets.length === 0 ? (
                    <div className="kds-empty">No Orders</div>
                  ) : (
                    colTickets.map(ticket => {
                      const src        = SOURCE_CFG[ticket.source];
                      const doneCount  = ticket.items.filter(i => i.itemStatus === 'done').length;
                      const readyCount = ticket.items.filter(i => i.itemStatus === 'ready' || i.itemStatus === 'done').length;
                      const readyPct   = ticket.items.length > 0 ? (readyCount / ticket.items.length) * 100 : 0;
                      const allDone    = doneCount === ticket.items.length;

                      return (
                        <div key={ticket.id}
                          className={'kds-ticket kds-ticket ' + (ticket.priority === 'rush' ? 'rush' : 'normal') + (col.key === 'preparing' ? ' preparing-highlight' : '')}
                          onClick={() => setSelectedTicket(ticket.id)}>
                          <div className="kds-ticket-header">
                            <span className="kds-ticket-icon">{src.icon}</span>
                            <div className="kds-ticket-info">
                              <div className="kds-ticket-top">
                                <span className="kds-ticket-num">{ticket.orderNum}</span>
                                {ticket.priority === 'rush' && <span className="kds-rush-badge">RUSH</span>}
                                {allDone && (
                                  <span style={{ fontSize: 14, background: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 6, padding: '1px 6px', fontWeight: 700, fontFamily: 'Syne,sans-serif' }}>
                                    ALL DONE
                                  </span>
                                )}
                              </div>
                              <div className="kds-ticket-src">
                                {ticket.source}{ticket.table ? ` • Table ${ticket.table}` : ''}
                              </div>
                            </div>
                            <TimerBadge createdAt={ticket.createdAt} />
                          </div>

                          {/* Readiness bar */}
                          {(col.key === 'preparing' || col.key === 'ready') && (
                            <div style={{ padding: '6px 14px 0' }}>
                              <div className="kds-readiness-bar">
                                <div className="kds-readiness-fill" style={{ width: `${readyPct}%`, background: allDone ? '#60A5FA' : readyPct === 100 ? '#22C55E' : '#FBBF24' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>Progress</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: allDone ? '#60A5FA' : readyCount === ticket.items.length ? '#22C55E' : '#FBBF24' }}>
                                  {doneCount}/{ticket.items.length} done
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Items */}
                          <div className="kds-items">
                            {ticket.items.map((item, idx) => (
                              <div key={idx} className={'kds-item-row' + (item.itemStatus === 'preparing' ? ' item-preparing' : item.itemStatus === 'ready' ? ' item-ready' : item.itemStatus === 'done' ? ' item-ready' : '')}>
                                <div className="kds-qty-badge">{item.qty}</div>
                                <div style={{ flex: 1 }}>
                                  <p className={'kds-item-name' + (item.itemStatus === 'preparing' ? ' preparing' : '')}>{item.name}</p>
                                  {item.variant && (
                                    <p style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, margin: '1px 0 0', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em' }}>
                                      ▸ {item.variant}
                                    </p>
                                  )}
                                  {item.notes && <p className="kds-item-notes">⚠ {item.notes}</p>}
                                </div>
                                <button className="kds-item-status-btn"
                                  style={{
                                    background: ITEM_STATUS_BG[item.itemStatus],
                                    color: ITEM_STATUS_COLOR[item.itemStatus],
                                    border: `1px solid ${ITEM_STATUS_COLOR[item.itemStatus]}40`,
                                    minWidth: 64,
                                  }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedItemPopup({ ticketId: ticket.id, itemIdx: idx });
                                  }}
                                  title="Click to update item status">
                                  {item.itemStatus === 'done'      ? '✓ Done'   :
                                   item.itemStatus === 'ready'     ? '✓ Ready'  :
                                   item.itemStatus === 'preparing' ? '⏳'        : '○'}
                                </button>
                              </div>
                            ))}
                            {ticket.extraItems && ticket.extraItems.length > 0 && (
                              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'Syne,sans-serif' }}>EXTRAS</span>
                                {ticket.extraItems.map((ex, i) => (
                                  <p key={i} style={{ fontSize: 14, color: 'var(--text-dim)', margin: '2px 0' }}>• {ex}</p>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <div className="kds-ticket-action">
                            {allDone ? (
                              <button className="kds-action-btn"
                                style={{ background: 'linear-gradient(135deg,#60A5FA,#2563EB)' }}
                                onClick={e => { e.stopPropagation(); bump(ticket.id); }}>
                                ✓ COMPLETE ORDER
                              </button>
                            ) : ticket.status !== 'ready' ? (
                              <button className="kds-action-btn"
                                style={{ background: ticket.status === 'new' ? 'linear-gradient(135deg,#FBBF24,#D97706)' : 'linear-gradient(135deg,#22C55E,#15803D)' }}
                                onClick={e => { e.stopPropagation(); advance(ticket.id); }}>
                                {ticket.status === 'new' ? 'START COOKING' : 'MARK READY'}
                              </button>
                            ) : (
                              <button className="kds-action-btn"
                                style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))' }}
                                onClick={e => { e.stopPropagation(); bump(ticket.id); }}>
                                COMPLETE ORDER
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="kds-pagination">
          <button className="kds-page-btn" onClick={() => setPage(p => p - 1)} disabled={currentPage === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} className={'kds-page-btn' + (n === currentPage ? ' active' : '')} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="kds-page-btn" onClick={() => setPage(p => p + 1)} disabled={currentPage === totalPages}>›</button>
          <span className="kds-page-info">Page {currentPage} of {totalPages} · {allActiveFiltered.length} active orders</span>
        </div>
      )}

      {/* Order Popup */}
      {selectedTicket && selectedTicketData && (
        <OrderPopup
          ticket={selectedTicketData}
          onClose={() => setSelectedTicket(null)}
          onAdvance={() => { advance(selectedTicket); setSelectedTicket(null); }}
          onBump={() => bump(selectedTicket)}
          onAddExtra={(text, cat) => addExtra(selectedTicket, text, cat)}
          onItemStatusChange={setItemStatus}
        />
      )}

      {/* Item Status Popup */}
      {selectedItemPopup && itemPopupTicket && itemPopupItem && (
        <ItemStatusPopup
          item={{ ...itemPopupItem, idx: selectedItemPopup.itemIdx }}
          ticketNum={itemPopupTicket.orderNum}
          onClose={() => setSelectedItemPopup(null)}
          onUpdate={(idx, status) => setItemStatus(selectedItemPopup.ticketId, idx, status)}
        />
      )}
    </div>
  );
}