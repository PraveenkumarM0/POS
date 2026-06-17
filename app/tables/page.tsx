'use client';
import { useState, useEffect } from 'react';
import { message } from 'antd';
import { useAuth } from '@/lib/AuthContext';
import api from "@/lib/api";

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface TableData {
  id: string;
  number: number;
  seats: number;
  area: string;
  status: TableStatus;
  waiter: string;
  orderId: string;
  orderTotal: number;
  occupiedSince: string;
  orderItems: any[];
  qrDataUrl?: string;
}

const S: Record<TableStatus, { label:string; color:string; dot:string; dimBg:string }> = {
  available: { label:'Available', color:'#22C55E', dot:'#22C55E', dimBg:'rgba(34,197,94,0.1)'  },
  occupied:  { label:'Occupied',  color:'#FF8C42', dot:'#FF8C42', dimBg:'rgba(255,140,66,0.1)' },
  reserved:  { label:'Reserved',  color:'#60A5FA', dot:'#60A5FA', dimBg:'rgba(96,165,250,0.1)' },
  cleaning:  { label:'Cleaning',  color:'#FBBF24', dot:'#FBBF24', dimBg:'rgba(251,191,36,0.1)' },
};

type TableView = { table: TableData; mode: 'view' | 'edit' | 'qr' };


function AddTableModal({
  onClose,
}: {
  onClose: () => void;
}) {

  const [form, setForm] = useState({
    number: "",
    seats: "4",
    area: "Main Hall",
    status: "available" as TableStatus,
  });

  const handle = async () => {
    try {
      if (!form.number) return;

      await api.post(
        "/tables",
        {
          tableNumber: Number(form.number),
          seats: Number(form.seats),
          area: form.area,
          status: form.status,
        }
      );

      message.success('Table created successfully');
      window.location.reload();
    } catch (error) {
      console.error("CREATE TABLE ERROR", error);
      message.error('Failed to create table');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--modal-bg)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 24, width: 320, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: '0 0 18px' }}>ADD TABLE</h2>

        {[
          { label: 'Table Number', key: 'number', type: 'number' },
          { label: 'Seats', key: 'seats', type: 'number' },
          { label: 'Area', key: 'area', type: 'text' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 5 }}>
              {f.label.toUpperCase()}
            </label>
            <input
              type={f.type}
              value={(form as Record<string, string>)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '11px 12px', minHeight: 44, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 5 }}>STATUS</label>
          <select
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as TableStatus }))}
            style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '11px 12px', minHeight: 44, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          >
            {(['available', 'occupied', 'reserved', 'cleaning'] as const).map(s => (
              <option key={s} value={s} style={{ background: 'var(--modal-bg)' }}>{S[s].label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handle}
          style={{ width: '100%', padding: '13px', minHeight: 48, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', marginBottom: 8 }}
        >
          CREATE TABLE
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '12px', minHeight: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
  

 

export default function TablesPage() {
  const { isAdmin, session } = useAuth();
  const canManageTables = isAdmin || (session?.user?.permissions ?? []).includes("tables");
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<TableView | null>(null);
  const [filter, setFilter] = useState<TableStatus | 'all'>('all');
  const [showAddTable, setShowAddTable] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [editForm, setEditForm] = useState<Partial<TableData>>({});

  const areas = Array.from(new Set(tables.map(t => t.area)));
  const loadTables = async () => {
  try {
    setLoading(true);

    const response = await api.get("/tables", {
      params: {
        page: 1,
        limit: 50,
      },
    });

    const apiTables =
      (
        response.data.data ||
        response.data.tables ||
        []
      ).map((t: any) => ({
        id:
          t._id,

        number:
          t.tableNumber ||
          t.number,

        seats:
          t.capacity ||
          t.seats ||
          4,

        area:
          t.area ||
          "Main Hall",

      status:
(
  (
    t.status ||
    "available"
  ).toLowerCase()
) as TableStatus,

        waiter:
          t.waiterName ||
          "",

        orderId:
          t.currentOrder?.posOrderNumber ||
          "",

        orderTotal:
          t.currentOrder?.totalAmount ||
          0,

        occupiedSince:
          t.updatedAt
            ? new Date(
                t.updatedAt
              ).toLocaleTimeString()
            : "",

        orderItems:
          t.currentOrder?.items ||
          [],

        qrDataUrl:
          t.qrDataUrl || undefined,
      }));

    setTables(apiTables);

  } catch (error) {
    console.error(
      "LOAD TABLES ERROR:",
      error
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadTables();
}, []);
  const shown = filter === 'all' ? tables : tables.filter(t => t.status === filter);
  const counts = { all: tables.length, available: tables.filter(t=>t.status==='available').length, occupied: tables.filter(t=>t.status==='occupied').length, reserved: tables.filter(t=>t.status==='reserved').length, cleaning: tables.filter(t=>t.status==='cleaning').length };

  const openPanel = (table: TableData, mode: 'view' | 'edit' | 'qr') => {
    setPanel({ table, mode });
    if (mode === 'edit') setEditForm({ ...table });
    setMenuOpen(null);
  };

const changeStatus = async (
  id: string,
  status: TableStatus
) => {

  try {

    await api.patch(
      `/tables/${id}`,
      { status }
    );

    await loadTables();
    message.success(`Status updated to ${S[status].label}`);

  } catch (error) {

    console.error(
      "STATUS UPDATE ERROR",
      error
    );
    message.error('Failed to update status');
  }
};

 const saveEdit = async () => {
  try {

    await api.patch(
      `/tables/${editForm.id}`,
      {
        tableNumber:
          editForm.number,

        seats:
          editForm.seats,

        area:
          editForm.area,

        status:
          editForm.status,
      }
    );

    await loadTables();
    message.success('Table updated successfully');
    setPanel(null);

  } catch (error) {

    console.error(
      "UPDATE TABLE ERROR",
      error
    );
    message.error('Failed to update table');
  }
};

  return (
    <><div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={() => setMenuOpen(null)}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>FLOOR PLAN</h1>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '2px 0 0', fontFamily: 'Syne,sans-serif', letterSpacing: '0.06em' }}>
                {counts.occupied} occupied &middot; {counts.available} available &middot; {tables.length} total
              </p>
            </div>
            {canManageTables && (
              <button onClick={() => setShowAddTable(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px', minHeight: 44, borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                ADD TABLE
              </button>
            )}
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {(['all', 'available', 'occupied', 'reserved', 'cleaning'] as const).map(s => (
              <button key={s} onClick={e => { e.stopPropagation(); setFilter(s); } }
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', minHeight: 40, borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'Syne,sans-serif', transition: 'all 0.15s',
                  background: filter === s ? (s === 'all' ? 'var(--primary)' : S[s].color) : 'var(--input-bg)',
                  color: filter === s ? 'white' : 'var(--text-dim)'
                }}>
                {s !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: filter === s ? 'white' : S[s].dot, display: 'block' }} />}
                {s === 'all' ? 'ALL' : S[s].label.toUpperCase()}
                <span style={{ fontSize: 14, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(0,0,0,0.2)', minWidth: 18, textAlign: 'center' }}>{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tables grid */}


        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

          {loading ? (

            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              Loading tables...
            </div>

          ) : (
            areas.map(area => {
              const areaRows = shown.filter(t => t.area === area);
              if (!areaRows.length) return null;
              return (
                <div key={area} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif' }}>{area.toUpperCase()}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{areaRows.length} tables</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                    {areaRows.map((table, i) => {
                      const cfg = S[table.status];
                      const isSel = panel?.table.id === table.id;
                      const isOccupied = table.status === 'occupied';
                      return (
                        <div key={table.id} className="anim-up"
                          style={{
                            animationDelay: `${i * 35}ms`, background: 'var(--card-bg)', borderRadius: 14, padding: '12px', border: `1.5px solid ${isSel ? cfg.color : isOccupied ? 'rgba(255,140,66,0.3)' : 'var(--border)'}`, transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
                            boxShadow: isSel ? `0 0 0 1px ${cfg.color}30, 0 8px 24px rgba(0,0,0,0.4)` : isOccupied ? '0 4px 16px rgba(255,140,66,0.12)' : 'none'
                          }}
                          onClick={() => openPanel(table, 'view')}
                          onMouseEnter={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`; } } }
                          onMouseLeave={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = isOccupied ? '0 4px 16px rgba(255,140,66,0.12)' : 'none'; } } }>

                          {/* 3-dot menu */}
                          <button onClick={e => {
                              e.stopPropagation();
                              if (menuOpen === table.id) { setMenuOpen(null); setMenuPos(null); return; }
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setMenuOpen(table.id);
                            }}
                            style={{ position: 'absolute', top: 6, right: 3, width: 50, height: 40, border: 'none', display: 'flex', alignItems: 'center', background: 'transparent', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.15s' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                          </button>

                          {/* Visual */}
                          <div style={{ position: 'relative', width: '100%', height: 68, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${cfg.color}25`, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                            {Array.from({ length: Math.min(table.seats, 8) }).map((_, si) => {
                              const angle = (si / Math.min(table.seats, 8)) * 360 - 90;
                              const rad = angle * Math.PI / 180;
                              const x = 50 + 40 * Math.cos(rad), y = 50 + 35 * Math.sin(rad);
                              return <div key={si} style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: cfg.color, opacity: 0.8, border: '1px solid rgba(0,0,0,0.4)', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }} />;
                            })}
                            <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: '2px 6px' }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, display: 'block' }} />
                              <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color, fontFamily: 'Syne,sans-serif' }}>{cfg.label.toUpperCase()}</span>
                            </div>

                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>Table {table.number}</p>
                              <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 1 }}>{table.seats} seats &middot; {table.area}</p>
                            </div>
                            {isOccupied && (
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', margin: 0 }}>SR {table.orderTotal}</p>
                                <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 1 }}>{table.occupiedSince}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>

      {/* â”€â”€ Right Panel â”€â”€ */}
      {panel && (() => {
        const t = tables.find(x => x.id === panel.table.id) || panel.table;
        const cfg = S[t.status];

        return (
          <div className="anim-right" style={{ width: 300, background: 'var(--header-bg)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Panel tabs */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['view', 'edit', 'qr'] as const).filter(m => m !== 'edit' || canManageTables).map(m => (
                  <button key={m} onClick={() => { if (m === 'edit') setEditForm({ ...t }); setPanel(p => p ? { ...p, mode: m } : p); } }
                    style={{
                      padding: '9px 16px', minHeight: 40, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Syne,sans-serif', letterSpacing: '0.05em', transition: 'all 0.15s',
                      background: panel.mode === m ? 'var(--primary)' : 'var(--input-bg)',
                      color: panel.mode === m ? 'white' : 'var(--text-dim)'
                    }}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={() => setPanel(null)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-dim)', padding: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

              {/* â”€â”€ VIEW MODE â”€â”€ */}
              {panel.mode === 'view' && (
                <>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginBottom: 12 }}>Table {t.number}</h2>
                  <div style={{ width: '100%', height: 100, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid ${cfg.color}30`, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                    {Array.from({ length: Math.min(t.seats, 8) }).map((_, si) => {
                      const angle = (si / Math.min(t.seats, 8)) * 360 - 90;
                      const rad = angle * Math.PI / 180;
                      const x = 50 + 38 * Math.cos(rad), y = 50 + 35 * Math.sin(rad);
                      return <div key={si} style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%', background: cfg.color, border: '1.5px solid rgba(0,0,0,0.4)', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }} />;
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {[['Area', t.area], ['Seats', `${t.seats} seats`], ['Status', t.status]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700 }}>{k}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: k === 'Status' ? cfg.color : 'var(--text)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', marginBottom: 7 }}>CHANGE STATUS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {(['available', 'occupied', 'reserved', 'cleaning'] as TableStatus[]).map(s => (
                      <button key={s} onClick={() => changeStatus(t.id, s)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', minHeight: 44, borderRadius: 9, border: `1px solid ${t.status === s ? S[s].color + '40' : 'transparent'}`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Syne,sans-serif', transition: 'all 0.15s',
                          background: t.status === s ? S[s].dimBg : 'var(--input-bg)', color: t.status === s ? S[s].color : 'var(--text-dim)'
                        }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: S[s].dot, display: 'block' }} />{S[s].label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPanel(p => p ? { ...p, mode: 'qr' } : p)}
                    style={{ width: '100%', padding: '12px', minHeight: 46, borderRadius: 10, border: '1px solid var(--primary-border)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Syne,sans-serif', background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                    VIEW QR CODE
                  </button>
                </>
              )}

              {/* â”€â”€ EDIT MODE â”€â”€ */}
              {panel.mode === 'edit' && (
                <>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginBottom: 14 }}>Edit Table {editForm.number}</h2>
                  {[{ label: 'Table Number', key: 'number', type: 'number' }, { label: 'Seats', key: 'seats', type: 'number' }, { label: 'Area', key: 'area' }].map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 5 }}>{f.label.toUpperCase()}</label>
                      <input type={f.type || 'text'} value={String((editForm as Record<string, unknown>)[f.key] || '')} onChange={e => setEditForm((p: Partial<TableData>) => ({ ...p, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '11px 12px', minHeight: 44, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 5 }}>STATUS</label>
                    <select value={editForm.status || 'available'} onChange={e => setEditForm((p: Partial<TableData>) => ({ ...p, status: e.target.value as TableStatus }))}
                      style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '11px 12px', minHeight: 44, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      {(['available', 'occupied', 'reserved', 'cleaning'] as const).map(s => <option key={s} value={s} style={{ background: 'var(--modal-bg)' }}>{S[s].label}</option>)}
                    </select>
                  </div>
                  <button onClick={saveEdit} style={{ width: '100%', padding: '13px', minHeight: 48, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', marginBottom: 8 }}>SAVE CHANGES</button>
                  <button onClick={() => setPanel(null)} style={{ width: '100%', padding: '12px', minHeight: 46, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>Cancel</button>
                </>
              )}

              {/* â”€â”€ QR MODE â”€â”€ */}
              {panel.mode === 'qr' && (
                <>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginBottom: 4 }}>QR Code</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>Table {t.number} &middot; {t.area}</p>
                  <div style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <img
  src={t.qrDataUrl}
  alt={`Table ${t.number} QR`}
  style={{
    width: 220,
    height: 220,
    objectFit: "contain",
    borderRadius: 12,
  }}
/>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#111', fontFamily: 'Syne,sans-serif', margin: 0 }}>Table {t.number}</p>
                  </div>
                  <a
                    href={t.qrDataUrl}
                    download={`Table_${t.number}_QR.png`}
                    style={{ display: 'block', width: '100%', marginBottom: 8, textDecoration: 'none' }}
                  >
                    <button style={{ width: '100%', padding: '13px', minHeight: 48, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 16l-4-4h3V4h2v8h3l-4 4z" fill="currentColor"/><path d="M4 18h16v2H4v-2z" fill="currentColor"/></svg>
                      DOWNLOAD QR
                    </button>
                  </a>
                  <button onClick={() => setPanel(p => p ? { ...p, mode: 'view' } : p)}
                    style={{ width: '100%', padding: '12px', minHeight: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Back</button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {showAddTable && <AddTableModal onClose={() => setShowAddTable(false)} />}

      {/* â”€â”€ Context menu â€” rendered fixed so it's never clipped by overflow:auto â”€â”€ */}
      {menuOpen && menuPos && (() => {
        const menuTable = tables.find(t => t.id === menuOpen);
        if (!menuTable) return null;
        return (
          <>
            {/* invisible backdrop to close on outside click */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => { setMenuOpen(null); setMenuPos(null); }} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, background: 'var(--modal-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px', zIndex: 999, minWidth: 160, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
            >
              {[
                {
                  label: 'View',
                  adminOnly: false,
                  icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>),
                  action: () => { openPanel(menuTable, 'view'); setMenuOpen(null); setMenuPos(null); }
                },
                {
                  label: 'Edit',
                  adminOnly: true,
                  icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
                  action: () => { openPanel(menuTable, 'edit'); setMenuOpen(null); setMenuPos(null); }
                },
                {
                  label: 'Delete',
                  adminOnly: true,
                  danger: true,
                  icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
                  action: async () => {
                    try {
                      await api.delete(`/tables/${menuTable.id}`);
                      await loadTables();
                      if (panel?.table.id === menuTable.id) setPanel(null);
                      message.success('Table deleted successfully');
                    } catch (error) {
                      console.error('DELETE TABLE ERROR', error);
                      message.error('Failed to delete table');
                    }
                    setMenuOpen(null); setMenuPos(null);
                  }
                },
              ].filter(item => !item.adminOnly || canManageTables).map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', minHeight: 44, borderRadius: 8, border: 'none', background: 'transparent', color: item.danger ? '#FF4444' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.danger ? 'rgba(255,68,68,0.1)' : 'var(--hover-bg)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </>
        );
      })()}
    </div></>
  );
}
