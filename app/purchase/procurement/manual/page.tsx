"use client";

import { useState } from "react";

export default function ManualPage() {
  const [data, setData] = useState({
    item: "",
    amount: "",
    notes: "",
  });

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>Manual Purchase</h3>

      <input
        placeholder="Item Name"
        value={data.item}
        onChange={(e) => setData({ ...data, item: e.target.value })}
      />

      <input
        placeholder="Amount"
        type="number"
        value={data.amount}
        onChange={(e) => setData({ ...data, amount: e.target.value })}
      />

      <textarea
        placeholder="Notes"
        value={data.notes}
        onChange={(e) => setData({ ...data, notes: e.target.value })}
      />

      <button>Save</button>
    </div>
  );
}