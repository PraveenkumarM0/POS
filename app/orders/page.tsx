"use client";
import { useState, useMemo, useEffect } from "react";
import "./orders.css";
import api from "@/lib/api";

const STATUS = {
  active: {
    label: "Active",
    color: "#FF8C42",
    bg: "rgba(255,140,66,0.1)",
    border: "rgba(255,140,66,0.2)",
  },
  completed: {
    label: "Completed",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
  },
  pending: {
    label: "Pending",
    color: "#FACC15",
    bg: "rgba(250,204,21,0.1)",
    border: "rgba(250,204,21,0.2)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
};

const TYPE_COLOR: Record<string, string> = {
  "Dine In": "#60A5FA",
  Takeaway: "var(--primary)",
  Delivery: "#A78BFA",
  "Auto card transaction": "#49ba50",
};

const PAGE_SIZE = 10;

type RawLineItem = { name: string; qty: number; price: number };

type OrderItem = {
  id: string;
  orderNumber: string | number;
  paymentMethod: string;
  table: string;
  type: string;
  items: number;
  total: number;
  status: string;
  time: string;
  date: string;
  rawItems: RawLineItem[];
  customer?: string;
  notes?: string;
};

const TODAY = new Date().toISOString().split("T")[0];

export default function OrdersPage() {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const filtered = useMemo(() => orders, [orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleDateChange =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setPage(1);
    };

  const clearFilters = () => {
    setDateFrom(TODAY);
    setDateTo(TODAY);
    setPage(1);
  };

  const loadOrders = async (from = dateFrom, to = dateTo) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: 1, limit: 500 };
      if (from) params.dateFrom = `${from}T00:00:00.000Z`;
      if (to)   params.dateTo   = `${to}T23:59:59.999Z`;

      const response = await api.get("/orders", { params });

      const raw: any[] = response.data.data || response.data.orders || [];
      const apiOrders: OrderItem[] = raw.map((o: any) => ({
        id: o._id || "",
        orderNumber: o.posOrderNumber || o._id?.slice(-6) || "ORD-001",
        paymentMethod: o.paymentMethod || o.paymentType || "Cash",
        table: o.table?.name || o.tableName || "Counter",
        type: o.orderType || "Dine In",
        items: o.items?.length || 0,
        total: o.totalAmount || o.total || 0,
        status: (o.status || "active").toLowerCase(),
        time: o.createdAt
          ? new Date(o.createdAt).toLocaleTimeString()
          : "-",
        date: o.createdAt
          ? new Date(o.createdAt).toISOString().split("T")[0]
          : "-",
        rawItems: (o.items || []).map((item: any) => ({
          name:
            item.name ||
            item.menuItem?.name ||
            item.itemName ||
            "Item",
          qty: item.quantity || item.qty || 1,
          price: item.price || item.unitPrice || item.totalPrice || 0,
        })),
        customer:
          o.customer?.name ||
          o.customerName ||
          o.guestName ||
          undefined,
        notes: o.notes || o.specialInstructions || undefined,
      }));

      setOrders(apiOrders);
    } catch (error) {
      console.error("LOAD ORDERS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(dateFrom, dateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  return (
    <div className="orders-root">
      <div className="orders-inner">
        <div className="anim-up" style={{ marginBottom: 24 }}>
          <p className="orders-heading-label">TODAY</p>
          <h1 className="orders-heading-title">ORDERS</h1>
        </div>

        {/* Summary bar */}
        <div
          className="anim-up orders-summary"
          style={{ animationDelay: "60ms" }}
        >
          {[
            {
              label: "Active",
              value: filtered.filter((o) => o.status === "active").length,
              color: "#FF8C42",
            },
            {
              label: "Completed",
              value: filtered.filter((o) => o.status === "completed").length,
              color: "#22C55E",
            },
            {
              label: "Revenue",
              value:
                "SR " +
                filtered
                  .reduce((s, o) => s + Number(o.total || 0), 0)
                  .toFixed(2),
              color: "var(--primary)",
            },
          ].map((s) => (
            <div key={s.label} className="orders-summary-card">
              <p className="orders-summary-card-label">
                {s.label.toUpperCase()}
              </p>
              <p
                className="orders-summary-card-value"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Date Range Filter */}
        <div
          className="anim-up orders-filters"
          style={{ animationDelay: "90ms" }}
        >
          <span className="orders-filter-label">DATE RANGE:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={handleDateChange(setDateFrom)}
            className="orders-date-input"
          />
          <span className="orders-filter-sep">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={handleDateChange(setDateTo)}
            className="orders-date-input"
          />
          {(dateFrom !== TODAY || dateTo !== TODAY) && (
            <button onClick={clearFilters} className="orders-filter-clear">
              Today
            </button>
          )}
          <span className="orders-page-info">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Order rows */}
        <div className="orders-list">
          {loading ? (
            <div className="orders-no-results">Loading orders...</div>
          ) : pageOrders.length === 0 ? (
            <div className="orders-no-results">No orders found.</div>
          ) : (
            pageOrders.map((o, i) => {
              const cfg =
                STATUS[
                  (o.status || "active").toLowerCase() as keyof typeof STATUS
                ] || STATUS.active;
              return (
                <div
                  key={o.id || o.orderNumber}
                  className="orders-row anim-up"
                  style={{ animationDelay: 120 + i * 50 + "ms" }}
                  onClick={() => setSelectedOrder(o)}
                >
                  <div
                    className="orders-status-dot"
                    style={{
                      background: cfg.bg,
                      border: "1px solid " + cfg.border,
                    }}
                  >
                    <span
                      className="orders-status-dot-inner"
                      style={{ background: cfg.color }}
                    />
                  </div>
                  <div className="orders-row-info">
                    <div className="orders-row-top">
                      <span className="orders-row-id">#{o.orderNumber}</span>
                      <span
                        className="orders-row-type"
                        style={{
                          color: TYPE_COLOR[o.type] || "#888",
                          background:
                            (TYPE_COLOR[o.type?.trim()] || "#888") + "15",
                        }}
                      >
                        {o.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="orders-row-meta">
                      {o.paymentMethod} · {o.table} · {o.items} items · {o.time} · {o.date}
                    </p>
                  </div>
                  <div className="orders-row-amount">
                    <p className="orders-row-total">SR {Number(o.total).toFixed(2)}</p>
                    <p
                      className="orders-row-status"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="orders-pagination">
            <button
              className="orders-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (n) =>
                  n === 1 ||
                  n === totalPages ||
                  Math.abs(n - currentPage) <= 1,
              )
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1)
                  acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, idx) =>
                n === "…" ? (
                  <span
                    key={"ellipsis-" + idx}
                    className="orders-page-info"
                    style={{ padding: "0 2px" }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    className={
                      "orders-page-btn" + (n === currentPage ? " active" : "")
                    }
                    onClick={() => setPage(n as number)}
                  >
                    {n}
                  </button>
                ),
              )}
            <button
              className="orders-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
            <span className="orders-page-info">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--input-border)",
              borderRadius: 18,
              padding: 28,
              width: "100%",
              maxWidth: 460,
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const cfg =
                STATUS[selectedOrder.status as keyof typeof STATUS] ||
                STATUS.active;
              return (
                <>
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--text-dim)",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          fontFamily: "Syne,sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        ORDER DETAILS
                      </p>
                      <h3
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "var(--text)",
                          fontFamily: "Syne,sans-serif",
                          margin: 0,
                        }}
                      >
                        #{selectedOrder.orderNumber}
                      </h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: cfg.bg,
                          border: "1px solid " + cfg.border,
                          color: cfg.color,
                          fontFamily: "Syne,sans-serif",
                        }}
                      >
                        {cfg.label.toUpperCase()}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid var(--input-border)",
                          background: "transparent",
                          color: "var(--text-dim)",
                          fontSize: 16,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      { label: "TYPE",    value: selectedOrder.type },
                      { label: "TABLE",   value: selectedOrder.table },
                      { label: "PAYMENT", value: selectedOrder.paymentMethod },
                      { label: "DATE",    value: selectedOrder.date + " " + selectedOrder.time },
                      ...(selectedOrder.customer
                        ? [{ label: "CUSTOMER", value: selectedOrder.customer }]
                        : []),
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "10px 12px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 14,
                            color: "var(--text-dim)",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            fontFamily: "Syne,sans-serif",
                            marginBottom: 3,
                          }}
                        >
                          {label}
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text)",
                            fontFamily: "Syne,sans-serif",
                            margin: 0,
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-dim)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      fontFamily: "Syne,sans-serif",
                      marginBottom: 8,
                    }}
                  >
                    ITEMS ({selectedOrder.items})
                  </p>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                      marginBottom: 16,
                    }}
                  >
                    {selectedOrder.rawItems.length === 0 ? (
                      <p
                        style={{
                          padding: "14px 16px",
                          fontSize: 14,
                          color: "var(--text-dim)",
                          margin: 0,
                        }}
                      >
                        No item details available.
                      </p>
                    ) : (
                      selectedOrder.rawItems.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            borderBottom:
                              idx < selectedOrder.rawItems.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: "var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                fontWeight: 800,
                                color: "var(--text-dim)",
                                fontFamily: "Syne,sans-serif",
                                flexShrink: 0,
                              }}
                            >
                              {item.qty}
                            </span>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--text)",
                              }}
                            >
                              {item.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--primary)",
                              fontFamily: "Syne,sans-serif",
                            }}
                          >
                            SR {Number(item.price).toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div
                      style={{
                        background: "rgba(250,204,21,0.06)",
                        border: "1px solid rgba(250,204,21,0.2)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          color: "#FACC15",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          fontFamily: "Syne,sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        NOTES
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--text-dim)",
                          margin: 0,
                        }}
                      >
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--input-border)",
                      paddingTop: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "var(--text-dim)",
                        fontFamily: "Syne,sans-serif",
                        letterSpacing: "0.06em",
                      }}
                    >
                      TOTAL
                    </span>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--primary)",
                        fontFamily: "Syne,sans-serif",
                      }}
                    >
                      SR {Number(selectedOrder.total).toFixed(2)}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}