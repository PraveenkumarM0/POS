"use client";

import { useState } from "react";
import { text } from "stream/consumers";

type Unit = "Kg" | "Pieces" | "Qty" | "Litre";

type RequestItem = {
  id: string;
  item: string;
  qty: string;
  price?: string;
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
  status: "Pending" | "Received";
};

/* ============================================================================
   INVENTORY
============================================================================ */

const INVENTORY = [
  { id: "1", name: "Chicken Burger Patty", stock: 50, uom: "Pieces" },
  { id: "2", name: "French Fries", stock: 25, uom: "Kg" },
  { id: "3", name: "Chicken Wings", stock: 35, uom: "Pieces" },
  { id: "4", name: "Coca Cola", stock: 150, uom: "Qty" },
  { id: "5", name: "Burger Buns(M)", stock: 200, uom: "Pieces" },
  { id: "6", name: "Cheese Slices", stock: 450, uom: "Pieces" },
];

/* ============================================================================
   MAIN PAGE
============================================================================ */

export default function PurchasePage() {
  const [openRequest, setOpenRequest] = useState(false);
  const [openManual, setOpenManual] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  return (
    <div
      style={{
        padding: 24,
        background: "var(--bg)",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            color: "var(--text)",
            fontWeight: 800,
            fontSize: 28,
          }}
        ></h1>

        {/* TOP BUTTONS */}
        {/* <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setOpenRequest(true)}
            style={outlineBtn}
          >
            ⊕ REQUEST
          </button>

          <button
            onClick={() => setOpenManual(true)}
            style={outlineBtn}
          >
            ＋ MANUAL
          </button>

          <button
            onClick={() => setOpenExpense(true)}
            style={fillBtn}
          >
            ＋ ADD EXPENSE
          </button>
        </div> */}
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* PROCUREMENT */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 style={titleStyle}>Procurement</h2>
            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              <button onClick={() => setOpenManual(true)} style={outlineBtn}>
                ＋ MANUAL
              </button>
              <button onClick={() => setOpenRequest(true)} style={fillBtn}>
                ⊕ REQUEST
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
            {requestHistory.length === 0 && (
              <p style={emptyStyle}>No Request History</p>
            )}

            {requestHistory.map((req) => (
              <div key={req.id} style={historyCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <b>{req.id}</b>

                  <span
                    style={{
                      color: req.status === "Pending" ? "#f59e0b" : "#22c55e",
                      fontWeight: 700,
                    }}
                  >
                    {req.status}
                  </span>
                </div>

                <p
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "var(--text-dim)",
                  }}
                >
                  {req.items.length} items
                </p>

                {req.items.map((i, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                      fontSize: 12,
                    }}
                  >
                    <span>{i.item}</span>

                    <span>
                      {i.qty} {i.uom}
                    </span>
                  </div>
                ))}

                {req.status === "Pending" && (
                  <button
                    style={receiveBtn}
                    onClick={() => {
                      setRequestHistory((prev) =>
                        prev.map((r) =>
                          r.id === req.id ? { ...r, status: "Received" } : r,
                        ),
                      );
                    }}
                  >
                    Receive
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* EXPENSE */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 style={titleStyle}>Expense</h2>
            <button onClick={() => setOpenExpense(true)} style={fillBtn}>
              ＋ ADD EXPENSE
            </button>
          </div>

          <div style={{ flex: 1 }}>
            {expenses.length === 0 && (
              <p style={emptyStyle}>No Expense Added</p>
            )}

            {expenses.map((e) => (
              <div key={e.id} style={historyCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{e.title}</span>

                  <b>SR {e.amount}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================================
          REQUEST MODAL
      ============================================================================ */}

      {openRequest && (
        <RequestModal
          onClose={() => setOpenRequest(false)}
          onSave={(data: RequestItem[]) => {
            setRequestHistory((prev) => [
              {
                id: "REQ-" + Date.now(),
                items: data,
                status: "Pending",
              },
              ...prev,
            ]);
          }}
        />
      )}

      {/* ============================================================================
          MANUAL MODAL
      ============================================================================ */}

      {openManual && (
        <ManualModal
          onClose={() => setOpenManual(false)}
          onSave={(data: RequestItem[]) => {
            setRequestHistory((prev) => [
              {
                id: "MAN-" + Date.now(),
                items: data,
                status: "Received",
              },
              ...prev,
            ]);
          }}
        />
      )}

      {/* ============================================================================
          EXPENSE MODAL
      ============================================================================ */}

      {openExpense && (
        <ExpenseModal
          onClose={() => setOpenExpense(false)}
          onSave={(data: Expense) => {
            setExpenses((prev) => [data, ...prev]);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   REQUEST MODAL
============================================================================ */

function RequestModal({ onClose, onSave }: any) {
  const [list, setList] = useState<RequestItem[]>([]);

  // INVENTORY STATE
  const [inventory, setInventory] = useState<any[]>(INVENTORY);

  // ADD ITEM POPUP
  const [showAddItem, setShowAddItem] = useState(false);

  // NEW ITEM FORM
  const [newItem, setNewItem] = useState({
    name: "",
    // stock: "",
    // uom: "Pieces" as Unit,
  });

  // ADD TO ORDER
  const addItem = (item: any) => {
    if (list.find((l) => l.id === item.id)) return;

    setList((prev) => [
      ...prev,
      {
        id: item.id,
        item: item.name,
        qty: "",
        price:"",
        uom: item.uom,
      },
    ]);
  };

  // SAVE NEW INVENTORY ITEM
  const handleSaveNewItem = () => {
    if (!newItem.name) return;

    const item = {
      id: Date.now().toString(),
      name: newItem.name,
      // stock: Number(newItem.stock),
      // uom: newItem.uom,
    };

    setInventory((prev) => [item, ...prev]);

    setNewItem({
      name: "",
      // stock: "",
      // uom: "Pieces",
    });

    setShowAddItem(false);
  };

  // REMOVE INVENTORY ITEM
  const removeInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <>
      <div style={modalBg}>
        <div style={requestCard}>
          {/* HEADER */}
          <div style={modalHeader}>
            <h2>Request from Super Inventory</h2>

            <button onClick={onClose} style={closeBtn}>
              ✕
            </button>
          </div>

          {/* BODY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginTop: 20,
            }}
          >
            {/* LEFT */}
            <div style={box}>
              {/* TITLE + BUTTON */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                  }}
                >
                  Inventory Items
                </h4>

                <button
                  onClick={() => setShowAddItem(true)}
                  style={{
                    border: "none",
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",

                    color: "#fff",

                    padding: "8px 14px",

                    borderRadius: 10,

                    fontWeight: 700,

                    fontSize: 11,

                    cursor: "pointer",
                  }}
                >
                  + Add New Item
                </button>
              </div>

              {/* INVENTORY LIST */}
              {inventory.map((item) => (
                <div key={item.id} style={row}>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {item.name}
                    </div>

                    {/* <div
                      style={{
                        color: "var(--text-dim)",
                        fontSize: 11,
                      }}
                    >
                      Stock: {item.stock} {item.uom}
                    </div> */}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    {/* ADD */}
                    <button style={plusBtn} onClick={() => addItem(item)}>
                      +
                    </button>

                    {/* DELETE */}
                    <button
                      onClick={() => removeInventoryItem(item.id)}
                      style={{
                        width: 34,
                        height: 34,

                        borderRadius: 8,

                        border: "none",

                        background: "rgba(239,68,68,0.12)",

                        color: "#ef4444",

                        cursor: "pointer",

                        fontWeight: 800,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT */}
            <div style={box} className="mt-5">
              <h4 style={{marginBottom:"5"}}>Order List</h4>

              {list.map((item) => (
                <div key={item.id} style={row}>
                  <span>{item.item}</span>

                  <select
                    value={item.uom}
                    onChange={(e) => {
                      setList((prev) =>
                        prev.map((p) =>
                          p.id === item.id
                            ? {
                                ...p,
                                uom: e.target.value as Unit,
                              }
                            : p,
                        ),
                      );
                    }}
                  >
                    <option>Kg</option>
                    <option>Pieces</option>
                    <option>Qty</option>
                  </select>

                  <input
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => {
                      setList((prev) =>
                        prev.map((p) =>
                          p.id === item.id
                            ? {
                                ...p,
                                qty: e.target.value,
                              }
                            : p,
                        ),
                      );
                    }}
                    style={qtyInput}
                  />
                </div>
              ))}

              <button
                style={submitBtn}
                onClick={() => {
                  onSave(list);
                  onClose();
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD ITEM POPUP */}
      {showAddItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,

            background: "rgba(0,0,0,0.6)",

            display: "flex",

            justifyContent: "center",

            alignItems: "center",

            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 360,

              background: "var(--card-bg)",

              borderRadius: 18,

              padding: 22,

              border: "1px solid var(--border)",
            }}
          >
            <h3
              style={{
                marginBottom: 18,
              }}
            >
              Add Inventory Item
            </h3>

            <input
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((p) => ({
                  ...p,
                  name: e.target.value,
                }))
              }
              style={{
                ...expenseInput,
                marginTop: 0,
              }}
            />

            {/* <input
              placeholder="Stock"
              value={newItem.stock}
              onChange={(e) =>
                setNewItem((p) => ({
                  ...p,
                  stock:
                    e.target.value,
                }))
              }
              style={expenseInput}
            />

            <select
              value={newItem.uom}
              onChange={(e) =>
                setNewItem((p) => ({
                  ...p,
                  uom:
                    e.target
                      .value as Unit,
                }))
              }
              style={expenseInput}
            >
              <option>Kg</option>
              <option>Pieces</option>
              <option>Qty</option>
              <option>Litre</option>
            </select> */}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={handleSaveNewItem}
                style={{
                  ...submitBtn,
                  marginTop: 0,
                  flex: 1,
                }}
              >
                Save Item
              </button>

              <button
                onClick={() => setShowAddItem(false)}
                style={{
                  flex: 1,

                  borderRadius: 12,

                  border: "1px solid var(--border)",

                  background: "transparent",

                  color: "var(--text)",

                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   MANUAL MODAL
============================================================================ */

function ManualModal({ onClose, onSave }: any) {
  const [list, setList] = useState<RequestItem[]>([
    {
      id: Date.now().toString(),
      item: "",
      price:"",
      qty: "",
      uom: "Pieces",
    },
  ]);

  return (
    <div style={modalBg}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <h2>Manual Purchase</h2>

          <button onClick={onClose} style={closeBtn}>
            ✕
          </button>
        </div>

        {list.map((item, idx) => (
          <div key={idx} style={manualRow}>
            <input
              placeholder="Item"
              value={item.item}
              onChange={(e) => {
                const copy = [...list];
                copy[idx].item = e.target.value;
                setList(copy);
              }}
              style={qtyInput}
            />
            <input placeholder="price"
            value={item.price}
              onChange={(e) => {
                const copy = [...list];

                copy[idx].price = e.target.value;
                setList(copy);
              }} style={qtyInput} />

            <input
              placeholder="Qty"
              value={item.qty}
              onChange={(e) => {
                const copy = [...list];
                copy[idx].qty = e.target.value;
                setList(copy);
              }}
              style={qtyInput}
            />

            <select
              value={item.uom}
              onChange={(e) => {
                const copy = [...list];
                copy[idx].uom = e.target.value as Unit;
                setList(copy);
              }}
            >
              <option>Kg</option>
              <option>Pieces</option>
              <option>Qty</option>
            </select>
          </div>
        ))}

        <button
          style={outlineBtn}
          onClick={() =>
            setList((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                item: "",
                price:"",
                qty: "",
                uom: "Pieces",
              },
            ])
          }
        >
          + ADD LINE
        </button>

        <button
          style={submitBtn}
          onClick={() => {
            onSave(list);
            onClose();
          }}
        >
          Save Purchase
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   EXPENSE MODAL
============================================================================ */

function ExpenseModal({ onClose, onSave }: any) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div style={modalBg}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <h2>Add Expense</h2>

          <button onClick={onClose} style={closeBtn}>
            ✕
          </button>
        </div>

        <input
          placeholder="Expense Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={expenseInput}
        />

        <input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={expenseInput}
        />

        <button
          style={submitBtn}
          onClick={() => {
            onSave({
              id: Date.now().toString(),
              title,
              amount,
            });

            onClose();
          }}
        >
          Save Expense
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   STYLES
============================================================================ */

const cardStyle = {
  background: "var(--card-bg)",
  borderRadius: 20,
  border: "1px solid var(--border)",
  padding: 20,
  height: "calc(100vh - 120px)",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

const titleStyle = {
  color: "var(--text)",
  fontWeight: 800,
  marginBottom: 20,
};

const historyCard = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  padding: 12,
  borderRadius: 12,
  marginBottom: 10,
};

const emptyStyle = {
  color: "var(--text-dim)",
};

const receiveBtn = {
  marginTop: 10,
  background: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
};

const modalBg = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalCard = {
  width: "40%",
  background: "var(--card-bg)",
  borderRadius: 16,
  padding: 20,
  border: "1px solid var(--border)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  
};

const closeBtn = {
  border: "none",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 20,
};

const box = {
  
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  gap: 10,
};

const plusBtn = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "none",
  background: "var(--primary)",
  color: "#fff",
  cursor: "pointer",
};

const qtyInput = {
  padding: 4,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
};

const submitBtn = {
  width: "100%",
  padding: 12,
  marginTop: 20,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#ef4444,#dc2626)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const manualRow = {
  display: "grid",
  gridTemplateColumns: "0fr 100px 50px 100px",
  gap: 12,
  alignItems: "center",
  marginBottom: 14,
};

const expenseInput = {
  width: "100%",
  padding: 10,
  marginTop: 12,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
};

const outlineBtn = {
  padding: "5px 20px",
  borderRadius: 14,
  border: "1.5px solid var(--primary)",
  background: "transparent",
  color: "var(--primary)",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: "0.04em",
  cursor: "pointer",
};

const fillBtn = {
  padding: "5px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg,#ef4444,#dc2626)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: "0.04em",
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
};
const requestCard = {
  width: "80%",
  background: "var(--card-bg)",
  borderRadius: 16,
  padding: 20,
  border: "1px solid var(--border)",
};