"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/data";

export default function RequestPage() {
  const [orderList, setOrderList] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const items = CATEGORIES.flatMap((cat) => cat.items).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (item: any) => {
    setOrderList((prev) => [...prev, { ...item, qty: 1 }]);
  };

  const removeItem = (index: number) => {
    setOrderList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        padding: 20,
        background: "var(--card-bg)",
        borderRadius: 16,
        border: "1px solid var(--border)",
      }}
    >
      {/* HEADER */}
      <h2 style={{ marginBottom: 10 }}>Request from Super Inventory</h2>

      {/* SEARCH */}
      <input
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: "1px solid var(--border)",
          marginBottom: 15,
          background: "var(--input-bg)",
          color: "var(--text)",
        }}
      />

      <div style={{ display: "flex", gap: 20 }}>
        
        {/* LEFT SIDE */}
        <div
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <h4 style={{ marginBottom: 10 }}>Inventory Items</h4>

          {items.map((item: any, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{item.name}</span>

              <button
                onClick={() => addItem(item)}
                style={{
                  background: "#e11d48",
                  color: "#fff",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <h4 style={{ marginBottom: 10 }}>Order List</h4>

          {orderList.length === 0 && (
            <p style={{ color: "gray" }}>No items added</p>
          )}

          {orderList.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{item.name}</span>

              <input
                type="number"
                value={item.qty}
                onChange={(e) => {
                  const updated = [...orderList];
                  updated[index].qty = e.target.value;
                  setOrderList(updated);
                }}
                style={{
                  width: 60,
                  padding: 5,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  textAlign: "center",
                }}
              />

              <button
                onClick={() => removeItem(index)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "red",
                  fontSize: 16,
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}