"use client";
import { useState } from "react";
import "./procurement.css";

type Unit = "Kg" | "Pieces" | "Qty" | "Litre";

type RequestItem = {
  id: string;
  item: string;
  qty: string;
  uom: Unit;
};

type ExtraItem = {
  id: string;
  item: string;
  qty: string;
  uom: Unit;
};

type Expense = {
  id: string;
  title: string;
  amount: string;
};

type RequestHistory = {
  id: string;
  items: RequestItem[];
  extraItems: ExtraItem[];
  status: "Pending" | "Received";
};

const INVENTORY = [
  { id: "1", name: "Chicken Burger Patty",  uom: "Pieces" },
  { id: "2", name: "French Fries",  uom: "Kg" },
  { id: "3", name: "Chicken Wings",  uom: "Pieces" },
  { id: "4", name: "Coca Cola", uom: "Qty" },
  { id: "5", name: "Burger Buns(M)",  uom: "Pieces" },
  { id: "6", name: "Cheese Slices",  uom: "Pieces" },
];

export default function PurchasePage() {
  const [tab, setTab] = useState<"request" | "manual">("request");
  const [openExpense, setOpenExpense] = useState(false);
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  return (
    <div className="proc-root">
      <div className="proc-grid">
        {/* PROCUREMENT */}
        <div className="proc-card">
          <div className="proc-card-header">
            <div>
              <h2 className="proc-card-title">Procurement</h2>
              <p className="proc-card-subtitle">INVENTORY ORDERS & PURCHASES</p>
            </div>
            <div className="proc-card-actions">
              <button
                onClick={() => setTab("request")}
                className={"proc-tab-btn outline" + (tab === "request" ? " active" : "")}
              >
                ⊕ REQUEST
              </button>
              <button
                onClick={() => setTab("manual")}
                className={"proc-tab-btn fill" + (tab !== "manual" ? " inactive" : "")}
              >
                ＋ MANUAL
              </button>
            </div>
          </div>

          <div className="proc-card-body">
            {tab === "request" ? (
              <>
                {requestHistory.length === 0 && <p className="proc-empty">No Request History</p>}
                {requestHistory.map(req => (
                  <div key={req.id} className="proc-history-card">
                    <div className="proc-history-card-header">
                      <b>{req.id}</b>
                      <span className={req.status === "Pending" ? "proc-status-pending" : "proc-status-received"}>
                        {req.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {req.items.map((i, idx) => (
                        <div key={idx} className="proc-history-item-row">
                          <span>{i.item}</span>
                          <span>{i.qty} {i.uom}</span>
                        </div>
                      ))}
                      {req.extraItems && req.extraItems.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', margin: '6px 0 4px', fontWeight: 700, letterSpacing: '0.06em' }}>EXTRA ITEMS</div>
                          {req.extraItems.map((i, idx) => (
                            <div key={idx} className="proc-history-item-row" style={{ color: 'var(--text-muted)' }}>
                              <span>{i.item}</span>
                              <span>{i.qty} {i.uom}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    {req.status === "Pending" && (
                      <button
                        className="proc-receive-btn"
                        onClick={() => setRequestHistory(prev => prev.map(r => r.id === req.id ? { ...r, status: "Received" } : r))}
                      >
                        Receive
                      </button>
                    )}
                  </div>
                ))}
                <RequestSection
                  onSave={(items: RequestItem[], extraItems: ExtraItem[]) => {
                    setRequestHistory(prev => [{ id: "REQ-" + Date.now(), items, extraItems, status: "Pending" }, ...prev]);
                  }}
                />
              </>
            ) : (
              <ManualPurchase
                onSave={(items: RequestItem[], extraItems: ExtraItem[]) => {
                  setRequestHistory(prev => [{ id: "MAN-" + Date.now(), items, extraItems, status: "Received" }, ...prev]);
                }}
              />
            )}
          </div>
        </div>

        {/* EXPENSE */}
        <div className="proc-card">
          <div className="proc-card-header">
            <div>
              <h2 className="proc-card-title">Expense</h2>
              <p className="proc-card-subtitle">DAILY EXPENSE MANAGEMENT</p>
            </div>
            <button onClick={() => setOpenExpense(true)} className="proc-tab-btn fill">＋ ADD EXPENSE</button>
          </div>
          <div className="proc-card-body">
            {expenses.length === 0 && <p className="proc-empty">No Expense Added</p>}
            {expenses.map(e => (
              <div key={e.id} className="proc-history-card">
                <div className="proc-expense-row">
                  <span>{e.title}</span>
                  <b>SR {e.amount}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {openExpense && (
        <ExpenseModal
          onClose={() => setOpenExpense(false)}
          onSave={(data: Expense) => { setExpenses(prev => [data, ...prev]); }}
        />
      )}
    </div>
  );
}

/* ── Request Section ── */
function RequestSection({ onSave }: { onSave: (items: RequestItem[], extra: ExtraItem[]) => void }) {
  const [list, setList] = useState<RequestItem[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [editingExtra, setEditingExtra] = useState<string | null>(null);
  const [newExtra, setNewExtra] = useState({ item: '', qty: '', uom: 'Pieces' as Unit });

  const addFromInventory = (inv: typeof INVENTORY[0]) => {
    if (list.find(l => l.id === inv.id)) return;
    setList(prev => [...prev, { id: inv.id, item: inv.name, qty: '', uom: inv.uom as Unit }]);
  };

  const addExtraItem = () => {
    if (!newExtra.item) return;
    setExtraItems(prev => [...prev, { id: 'ex_' + Date.now(), ...newExtra }]);
    setNewExtra({ item: '', qty: '', uom: 'Pieces' });
  };

  const deleteExtra = (id: string) => setExtraItems(prev => prev.filter(e => e.id !== id));

  const saveEditExtra = (id: string, updated: Partial<ExtraItem>) => {
    setExtraItems(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    setEditingExtra(null);
  };

  return (
    <div className="proc-request-section">
      <div className="proc-two-col">
        {/* Inventory */}
        <button>new item </button>
        <div className="proc-box">
          <h4>Inventory Items</h4>
          {INVENTORY.map(item => (
            <div key={item.id} className="proc-inventory-row">
              
              <button className="proc-plus-btn" onClick={() => addFromInventory(item)}>+</button>
            </div>
          ))}

          {/* Extra Items */}
          <div className="proc-extra-header">
            <span className="proc-extra-title">EXTRA ITEMS</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px auto', gap: 4, marginBottom: 8 }}>
            <input className="proc-input-sm" placeholder="Item name" value={newExtra.item}
              onChange={e => setNewExtra(p => ({ ...p, item: e.target.value }))} />
            <input className="proc-input-sm" placeholder="Qty" value={newExtra.qty}
              onChange={e => setNewExtra(p => ({ ...p, qty: e.target.value }))} />
            <select className="proc-input-sm" value={newExtra.uom}
              onChange={e => setNewExtra(p => ({ ...p, uom: e.target.value as Unit }))}>
              <option>Kg</option><option>Pieces</option><option>Qty</option><option>Litre</option>
            </select>
            <button className="proc-extra-add-btn" onClick={addExtraItem} style={{ padding: '4px 6px' }}>+</button>
          </div>
        </div>

        {/* Order List */}
        <div className="proc-box">
          <h4>Order List</h4>
          {list.map(item => (
            <div key={item.id} className="proc-order-row">
              <span className="proc-order-row-name">{item.item}</span>
              <select value={item.uom} className="proc-select" style={{ fontSize: 11, padding: '6px 8px' }}
                onChange={e => setList(prev => prev.map(p => p.id === item.id ? { ...p, uom: e.target.value as Unit } : p))}>
                <option>Kg</option><option>Pieces</option><option>Qty</option>
              </select>
              <input placeholder="Qty" value={item.qty} className="proc-input" style={{ width: 60, fontSize: 12, padding: '6px 8px' }}
                onChange={e => setList(prev => prev.map(p => p.id === item.id ? { ...p, qty: e.target.value } : p))} />
            </div>
          ))}

          {/* Extra Items in Order */}
          {extraItems.length > 0 && (
            <>
              <div className="proc-extra-header">
                <span className="proc-extra-title">EXTRA ITEMS</span>
              </div>
              {extraItems.map(ex => (
                editingExtra === ex.id ? (
                  <EditExtraRow key={ex.id} item={ex} onSave={updated => saveEditExtra(ex.id, updated)} onCancel={() => setEditingExtra(null)} />
                ) : (
                  <div key={ex.id} className="proc-extra-static-row">
                    <span className="proc-extra-static-name">{ex.item}</span>
                    <span className="proc-extra-static-qty">{ex.qty} {ex.uom}</span>
                    <button className="proc-extra-icon-btn edit" onClick={() => setEditingExtra(ex.id)} title="Edit">✏</button>
                    <button className="proc-extra-icon-btn del" onClick={() => deleteExtra(ex.id)} title="Delete">✕</button>
                  </div>
                )
              ))}
            </>
          )}

          <button className="proc-submit-btn"
            onClick={() => { onSave(list, extraItems); setList([]); setExtraItems([]); }}>
            SUBMIT REQUEST
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Extra Row ── */
function EditExtraRow({ item, onSave, onCancel }: { item: ExtraItem; onSave: (u: Partial<ExtraItem>) => void; onCancel: () => void }) {
  const [val, setVal] = useState({ item: item.item, qty: item.qty, uom: item.uom });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px auto auto', gap: 4, marginBottom: 8, background: 'rgba(232,68,58,0.06)', borderRadius: 8, padding: 4 }}>
      <input className="proc-input-sm" value={val.item} onChange={e => setVal(p => ({ ...p, item: e.target.value }))} />
      <input className="proc-input-sm" value={val.qty} onChange={e => setVal(p => ({ ...p, qty: e.target.value }))} />
      <select className="proc-input-sm" value={val.uom} onChange={e => setVal(p => ({ ...p, uom: e.target.value as Unit }))}>
        <option>Kg</option><option>Pieces</option><option>Qty</option><option>Litre</option>
      </select>
      <button className="proc-extra-save-btn" onClick={() => onSave(val)}>✓</button>
      <button className="proc-extra-icon-btn" onClick={onCancel}>✕</button>
    </div>
  );
}

/* ── Manual Purchase ── */
function ManualPurchase({ onSave }: { onSave: (items: RequestItem[], extra: ExtraItem[]) => void }) {
  const [list, setList] = useState<RequestItem[]>([{ id: Date.now().toString(), item: '', qty: '', uom: 'Pieces' }]);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [editingExtra, setEditingExtra] = useState<string | null>(null);
  const [newExtra, setNewExtra] = useState({ item: '', qty: '', uom: 'Pieces' as Unit });

  const addExtraItem = () => {
    if (!newExtra.item) return;
    setExtraItems(prev => [...prev, { id: 'ex_' + Date.now(), ...newExtra }]);
    setNewExtra({ item: '', qty: '', uom: 'Pieces' });
  };

  const deleteExtra = (id: string) => setExtraItems(prev => prev.filter(e => e.id !== id));

  const saveEditExtra = (id: string, updated: Partial<ExtraItem>) => {
    setExtraItems(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    setEditingExtra(null);
  };

  return (
    <div className="proc-request-section">
      {list.map((item, idx) => (
        <div key={item.id} className="proc-manual-row">
          <input placeholder="Item" value={item.item} className="proc-input"
            onChange={e => { const c = [...list]; c[idx].item = e.target.value; setList(c); }} />
          <input placeholder="Qty" value={item.qty} className="proc-input"
            onChange={e => { const c = [...list]; c[idx].qty = e.target.value; setList(c); }} />
          <select value={item.uom} className="proc-select"
            onChange={e => { const c = [...list]; c[idx].uom = e.target.value as Unit; setList(c); }}>
            <option>Kg</option><option>Pieces</option><option>Qty</option>
          </select>
        </div>
      ))}

      {/* Extra Items */}
      <div className="proc-extra-header">
        <span className="proc-extra-title">EXTRA ITEMS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px auto', gap: 6, marginBottom: 10 }}>
        <input className="proc-input-sm" placeholder="Item name" value={newExtra.item}
          onChange={e => setNewExtra(p => ({ ...p, item: e.target.value }))} />
        <input className="proc-input-sm" placeholder="Qty" value={newExtra.qty}
          onChange={e => setNewExtra(p => ({ ...p, qty: e.target.value }))} />
        <select className="proc-input-sm" value={newExtra.uom}
          onChange={e => setNewExtra(p => ({ ...p, uom: e.target.value as Unit }))}>
          <option>Kg</option><option>Pieces</option><option>Qty</option><option>Litre</option>
        </select>
        <button className="proc-extra-add-btn" onClick={addExtraItem}>+ ADD</button>
      </div>

      {extraItems.map(ex => (
        editingExtra === ex.id ? (
          <EditExtraRow key={ex.id} item={ex} onSave={updated => saveEditExtra(ex.id, updated)} onCancel={() => setEditingExtra(null)} />
        ) : (
          <div key={ex.id} className="proc-extra-static-row">
            <span className="proc-extra-static-name">{ex.item}</span>
            <span className="proc-extra-static-qty">{ex.qty} {ex.uom}</span>
            <button className="proc-extra-icon-btn edit" onClick={() => setEditingExtra(ex.id)} title="Edit">✏</button>
            <button className="proc-extra-icon-btn del" onClick={() => deleteExtra(ex.id)} title="Delete">✕</button>
          </div>
        )
      ))}

      <div className="proc-submit-row">
        <button className="proc-add-line-btn"
          onClick={() => setList(prev => [...prev, { id: Date.now().toString(), item: '', qty: '', uom: 'Pieces' }])}>
          + ADD LINE
        </button>
        <button className="proc-submit-btn"
          onClick={() => {
            onSave(list, extraItems);
            setList([{ id: Date.now().toString(), item: '', qty: '', uom: 'Pieces' }]);
            setExtraItems([]);
          }}>
          SAVE PURCHASE
        </button>
      </div>
    </div>
  );
}

/* ── Expense Modal ── */
function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Expense) => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <div className="proc-modal-bg">
      <div className="proc-modal-card">
        <div className="proc-modal-header">
          <h2 className="proc-card-title">Add Expense</h2>
          <button onClick={onClose} className="proc-close-btn">✕</button>
        </div>
        <input placeholder="Expense Title" value={title} className="proc-expense-input"
          onChange={e => setTitle(e.target.value)} />
        <input placeholder="Amount" value={amount} className="proc-expense-input"
          onChange={e => setAmount(e.target.value)} />
        <button className="proc-submit-btn" style={{ marginTop: 16, width: '100%' }}
          onClick={() => { onSave({ id: Date.now().toString(), title, amount }); onClose(); }}>
          SAVE EXPENSE
        </button>
      </div>
    </div>
  );
}
