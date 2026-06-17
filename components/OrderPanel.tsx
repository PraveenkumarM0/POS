'use client';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useCart, CartItem } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DineOrder {
  id: string;
  table: number;
  tableId: string;
  customer: string;
  phone: string;
  items: number;
  total: number;
  tableStatus: string;
  orderStatus: string;
  rawItems: any[];
}

// ── Print bill helper ──────────────────────────────────────────────────────────
function printBill(opts: {
  orderNum: string; orderType: string; tableNum?: number | null;
  items: { name: string; qty: number; price: number }[];
  subtotal: number; discount: number; total: number; cashierName: string;
  payMethod?: string; cashReceived?: number; change?: number;
}) {
  const { orderNum, orderType, tableNum, items, subtotal, discount, total, cashierName, payMethod, cashReceived, change } = opts;
  const discAmt = subtotal * discount / 100;
  const now = new Date();
  const dateStr = now.toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
  const html = `<!DOCTYPE html><html><head><title>Receipt ${orderNum}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 12px 8px; font-size: 12px; color: #111; background: white; }
  .center { text-align: center; } .bold { font-weight: bold; } .big { font-size: 18px; font-weight: 900; }
  .divider { border: none; border-top: 1px dashed #666; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .row-item { display: flex; gap: 6px; margin: 4px 0; } .item-name { flex: 1; }
  .total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; margin-top: 6px; }
  .badge { background: #111; color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 10px; display: inline-block; margin: 4px 0; }
  .table-badge { background: #e8443a; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 900; display: inline-block; margin: 6px 0; }
  .footer { font-size: 10px; color: #888; text-align: center; margin-top: 10px; }
</style></head><body>
<div class="center">
  <div class="big">RESTOPOS</div>
  <div style="font-size:11px;color:#666;">Tax Invoice / Receipt</div>
  <hr class="divider"/>
  <div class="bold" style="font-size:14px;">${orderType.toUpperCase()}</div>
  ${tableNum ? `<div class="table-badge">🍽 TABLE ${tableNum}</div>` : ''}
  <div class="badge">ORDER ${orderNum}</div>
  <div style="font-size:10px;color:#888;margin-top:4px;">${dateStr}</div>
  <div style="font-size:10px;color:#888;">Cashier: ${cashierName}</div>
</div>
<hr class="divider"/>
<div class="bold" style="margin-bottom:4px;">ITEMS</div>
${items.map(i => `<div class="row-item"><span class="bold">${i.qty}x</span><span class="item-name">${i.name}</span><span>SR ${(i.price * i.qty).toFixed(2)}</span></div>`).join('')}
<hr class="divider"/>
<div class="row"><span>Subtotal</span><span>SR ${subtotal.toFixed(2)}</span></div>
${discount > 0 ? `<div class="row"><span>Discount (${discount}%)</span><span>- SR ${discAmt.toFixed(2)}</span></div>` : ''}
<div class="row"><span>VAT (15%)</span><span>SR ${(total * 0.15 / 1.15).toFixed(2)}</span></div>
<hr class="divider"/>
<div class="total-row"><span>TOTAL</span><span>SR ${total.toFixed(2)}</span></div>
${payMethod ? `<hr class="divider"/>
<div class="row"><span>Payment</span><span>${payMethod}</span></div>
${payMethod === 'Cash' && cashReceived ? `<div class="row"><span>Cash Received</span><span>SR ${cashReceived.toFixed(2)}</span></div>` : ''}
${change && change > 0 ? `<div class="row bold"><span>Change</span><span>SR ${change.toFixed(2)}</span></div>` : ''}` : ''}
<hr class="divider"/>
<div class="footer">
  <div>Thank you for dining with us!</div><div>شكراً لزيارتكم</div>
  <div style="margin-top:6px;font-size:9px;">This is your official VAT receipt</div>
  <div style="font-size:9px;">TRN: 300123456789</div>
</div></body></html>`;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 400);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderPanel() {
  const { cart, updateQty, clearCart, loadItems, discount, setDiscount, orderType, setOrderType, subtotal, total } = useCart();
  const { session } = useAuth();

  const [step, setStep] = useState<'order' | 'checkout' | 'payment' | 'cash' | 'done'>('order');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'Online' | null>(null);
  const [cashInput, setCashInput] = useState('');
  const [paidInfo, setPaidInfo] = useState<{ method: string; cash?: number; change?: number } | null>(null);

  const [showDisc, setShowDisc] = useState(false);
  const [discVal, setDiscVal] = useState('');
  const [showQRScan, setShowQRScan] = useState(false);
  const [qrOrderData, setQROrderData] = useState('');
  const [qrProcessing, setQRProcessing] = useState(false);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showDineBilling, setShowDineBilling] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // API state
  const [dineOrders, setDineOrders] = useState<DineOrder[]>([]);
  const [dineOrdersLoading, setDineOrdersLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Real tables from backend { _id, tableNumber, status }
  const [tablesList, setTablesList] = useState<{ _id: string; tableNumber: number; status: string }[]>([]);

  useEffect(() => {
    api.get('/tables', { params: { limit: 100 } }).then(r => {
      const rows = r.data.data ?? r.data.tables ?? [];
      setTablesList(rows.map((t: any) => ({ _id: t._id, tableNumber: t.tableNumber ?? t.number, status: t.status ?? 'available' })));
    }).catch(() => {});
  }, []);
  const [currentOrderNum] = useState('#' + String(Math.floor(1000 + Math.random() * 9000)));
  const cashierName = session?.user?.name || 'Cashier';
  const cashReceived = parseFloat(cashInput) || 0;
  const change = Math.max(0, cashReceived - total);
  const discAmt = subtotal * discount / 100;
  const taxAmt = total * 0.15 / 1.15;
  const isDineIn = orderType === 'Dine In';

  // ── Load occupied dine-in orders from API ──────────────────────────────────
  const loadDineOrders = useCallback(async () => {
    try {
      setDineOrdersLoading(true);
      // Get tables that are occupied — they have active orders
      const tableRes = await api.get('/tables', { params: { page: 1, limit: 50 } });
      const allTables = tableRes.data.data || tableRes.data.tables || [];
      const occupiedTables = allTables.filter((t: any) => t.status === 'occupied');

      const mapped: DineOrder[] = occupiedTables.map((t: any) => {
        const ord = t.currentOrderId ?? t.currentOrder ?? null;
        return {
          id:          ord?._id || t._id,
          table:       t.tableNumber || t.number,
          tableId:     t._id,
          customer:    ord?.customerInfo?.name || t.customerName || 'Guest',
          phone:       ord?.customerInfo?.phone || '',
          items:       ord?.items?.length || 0,
          total:       ord?.totalAmount ?? ord?.total ?? 0,
          tableStatus: t.status,
          orderStatus: ord?.status || '',
          rawItems:    ord?.items || [],
        };
      });

      setDineOrders(mapped);
    } catch (err) {
      console.error('LOAD DINE ORDERS ERROR:', err);
    } finally {
      setDineOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDineIn && showDineBilling) loadDineOrders();
  }, [isDineIn, showDineBilling, loadDineOrders]);

  // Auto-poll dine orders every 12 s while in dine-in mode to pick up bill requests
  useEffect(() => {
    if (!isDineIn) return;
    const id = setInterval(loadDineOrders, 12_000);
    return () => clearInterval(id);
  }, [isDineIn, loadDineOrders]);


  // ── Create order on API ────────────────────────────────────────────────────
  const createOrder = async (): Promise<string | null> => {
    try {
      setSubmitting(true);
      setApiError('');

      const orderTypeMap: Record<string, string> = {
        'Dine In':  'dine_in',
        'Takeaway': 'takeaway',
        // 'Delivery': 'delivery',
      };

      const body: Record<string, any> = {
        orderType: orderTypeMap[orderType] || 'takeaway',
        items: cart.map(item => {
          // item.id format: "menuItemId" or "menuItemId_VariantLabel"
          const [menuItemId] = item.id.split('_');
          const entry: Record<string, any> = {
            menuItem: menuItemId,
            quantity: item.qty,
            note: '',
          };
          // Re-attach variant if present
          if (item.id.includes('_')) {
            const variantLabel = item.id.split('_').slice(1).join('_');
            entry.selectedVariant = { label: variantLabel, price: item.price };
          }
          return entry;
        }),
        discountPercent: discount || 0,
        notes: '',
      };

      if (isDineIn && selectedTableId) {
        body.tableId = selectedTableId;
      }

      if (orderType === 'Takeaway' || orderType === 'Delivery') {
        body.customerInfo = {
          name:    customerName || 'Walk-in',
          phone:   customerPhone || '',
          ...(orderType === 'Delivery' ? { address: '' } : {}),
        };
      }

      const res = await api.post('/orders', body);
      const orderId = res.data.data?._id || res.data._id || res.data.order?._id;
      setCreatedOrderId(orderId);
      return orderId;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create order';
      setApiError(msg);
      console.error('CREATE ORDER ERROR:', err);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // ── Process payment on API ─────────────────────────────────────────────────
  const processPayment = async (orderId: string, method: string, cash?: number): Promise<boolean> => {
    try {
      setSubmitting(true);
      setApiError('');
      const paymentMethodMap: Record<string, string> = {
        Cash: 'cash', Card: 'card', Online: 'online',
      };
      const body: Record<string, any> = {
        paymentMethod: paymentMethodMap[method] || 'cash',
        status: 'completed',
      };
      if (method === 'Cash' && cash) body.cashReceived = cash;

      await api.post(`/orders/${orderId}/pay`, body);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Payment failed';
      setApiError(msg);
      console.error('PAYMENT ERROR:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // ── Finalize: create order then pay ───────────────────────────────────────
  const finalizePay = async (method: string, cash?: number, chg?: number) => {
    // Create order first if not already created
    let orderId = createdOrderId;
    if (!orderId) {
      orderId = await createOrder();
      if (!orderId) return; // creation failed, stay on screen
    }

    // Process payment
   const ok = await processPayment(orderId, method, cash);
if (!ok) return;

await loadDineOrders();

setPaidInfo({ method, cash, change: chg });
setStep('done');
  };

  const applyDisc = () => {
    setDiscount(Math.min(100, Math.max(0, parseFloat(discVal) || 0)));
    setShowDisc(false);
  };

  const handlePrint = (method?: string, cash?: number, chg?: number) => {
    printBill({
      orderNum: currentOrderNum, orderType, tableNum: selectedTable,
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal, discount, total, cashierName,
      payMethod: method, cashReceived: cash, change: chg,
    });
  };

  const resetAll = () => {
    clearCart();
    setStep('order');
    setPayMethod(null);
    setCashInput('');
    setPaidInfo(null);
    setSelectedTable(null);
    setSelectedTableId(null);
    setDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
    setCreatedOrderId(null);
    setApiError('');
  };

  // ── Move to checkout: create order eagerly so we have an ID ───────────────
  const handleProceedCheckout = async () => {
    if (cart.length === 0) return;
    const orderId = await createOrder();
    if (orderId) setStep('checkout');
  };

  // ── Dine In Table Banner ───────────────────────────────────────────────────
  const DineInTableBanner = () => {
    if (!isDineIn || !selectedTable) return null;
    return (
      <div style={{ margin: '20px 15px 0', padding: '20px 14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(232,68,58,0.18),rgba(232,68,58,0.08))', border: '1.5px solid var(--primary-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(232,68,58,0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="20" height="4" rx="2" fill="white"/>
            <rect x="5" y="11" width="3" height="7" rx="1" fill="white"/>
            <rect x="16" y="11" width="3" height="7" rx="1" fill="white"/>
            <rect x="8" y="11" width="8" height="2" rx="1" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.12em', fontFamily: 'Syne,sans-serif', margin: '0 0 2px' }}>DINE IN — TABLE</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0, lineHeight: 1 }}>{selectedTable}</p>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 20, background: 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '0.06em' }}>OCCUPIED</div>
      </div>
    );
  };

  // ── Error banner ───────────────────────────────────────────────────────────
  const ErrorBanner = () => {
    if (!apiError) return null;
    return (
      <div style={{ margin: '8px 14px 0', padding: '8px 12px', borderRadius: 9, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#FF4444', fontSize: 14, fontWeight: 700 }}>
        ⚠ {apiError}
      </div>
    );
  };

  // ── renderCart ─────────────────────────────────────────────────────────────
  const renderCart = () => (
    <>
      {/* Order type */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, background: 'var(--input-bg)', padding: 3, borderRadius: 10, border: '1px solid var(--border)' }}>
          {(['Takeaway', 'Dine In',] as const).map(t => (
            <button key={t} onClick={() => { setOrderType(t); if (t !== 'Dine In') { setSelectedTable(null); setSelectedTableId(null); } }}
              style={{ padding: '11px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, letterSpacing: '0.03em', transition: 'all 0.18s', fontFamily: 'Syne,sans-serif',
                background: orderType === t ? 'linear-gradient(135deg,var(--primary),var(--primary-dim))' : 'transparent',
                color: orderType === t ? 'white' : 'var(--text-dim)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Dine In: table selector + QR orders */}
      {isDineIn && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--primary-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', margin: 0 }}>DINE IN BILLING</p>
            <button onClick={() => setShowDineBilling(!showDineBilling)}
              style={{ border: 'none', background: 'var(--primary)', color: 'white', borderRadius: 9, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', position: 'relative', minHeight: 40 }}>
              {showDineBilling ? 'CLOSE' : 'QR ORDERS'}
              {!showDineBilling && dineOrders.filter(o => o.orderStatus === 'bill_requested').length > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#FF3B30', color: 'white',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dineOrders.filter(o => o.orderStatus === 'bill_requested').length}
                </span>
              )}
            </button>
          </div>

          {showDineBilling ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dineOrdersLoading ? (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>Loading orders…</p>
              ) : dineOrders.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>No active dine-in orders</p>
              ) : dineOrders.map(order => {
                const isBillRequested = order.orderStatus === 'bill_requested';
                return (
                <div key={order.id} style={{
                  background: isBillRequested ? 'rgba(255,59,48,0.08)' : 'var(--input-bg)',
                  border: isBillRequested ? '1.5px solid rgba(255,59,48,0.5)' : '1px solid var(--border)',
                  borderRadius: 12, padding: '12px',
                  boxShadow: isBillRequested ? '0 0 0 2px rgba(255,59,48,0.15)' : 'none',
                }}>
                  {isBillRequested && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, background: 'rgba(255,59,48,0.12)', borderRadius: 6, padding: '4px 8px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B30', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#FF3B30', letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: 0 }}>BILL REQUESTED — CUSTOMER WAITING</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🍽 TABLE {order.table}</p>
                      <p style={{ fontSize: 14, color: 'var(--text)', margin: '4px 0 0', fontWeight: 700 }}>{order.customer}</p>
                      {order.phone && <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '2px 0 0' }}>{order.phone}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>SR {order.total}</p>
                      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>{order.items} Items</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      // Fetch full order from API to get complete item data
                      let sourceItems = order.rawItems;
                      let orderCustomerName = order.customer;
                      let orderCustomerPhone = order.phone;
                      try {
                        const res = await api.get(`/orders/${order.id}`);
                        const full = res.data.data ?? res.data;
                        sourceItems = full.items ?? sourceItems;
                        orderCustomerName = full.customerInfo?.name || orderCustomerName;
                        orderCustomerPhone = full.customerInfo?.phone || orderCustomerPhone;
                      } catch { /* fall back to rawItems already set above */ }

                      const cartItems: CartItem[] = sourceItems.map((item: any) => {
                        const menuItemId = item.menuItem?._id || (typeof item.menuItem === 'string' ? item.menuItem : '') || '';
                        const variantLabel = item.selectedVariant?.label;
                        const id = variantLabel ? `${menuItemId}_${variantLabel}` : menuItemId;
                        const price = item.selectedVariant?.price ?? item.unitPrice ?? item.price ?? item.menuItem?.price ?? 0;
                        const baseName = item.menuItem?.name || item.name || 'Item';
                        const name = variantLabel ? `${baseName} (${variantLabel})` : baseName;
                        return { id, name, price, img: item.menuItem?.imageUrl || item.menuItem?.image || '', qty: item.quantity || 1 };
                      });
                      loadItems(cartItems);
                      setSelectedTable(order.table);
                      setSelectedTableId(order.tableId);
                      setCustomerName(orderCustomerName);
                      setCustomerPhone(orderCustomerPhone);
                      setCreatedOrderId(order.id);
                      setShowDineBilling(false);
                      setStep('checkout');
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>
                    OPEN BILLING
                  </button>
                </div>
              )})}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 7 }}>ALLOCATE TABLE</p>
              <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 4 }}>
                {tablesList.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Loading tables…</p>
                ) : tablesList.map(t => {
                  const isSelected = selectedTable === t.tableNumber;
                  const isOccupied = t.status === 'occupied';
                  return (
                    <button key={t._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTable(null);
                          setSelectedTableId(null);
                        } else {
                          setSelectedTable(t.tableNumber);
                          setSelectedTableId(t._id);
                        }
                      }}
                      title={isOccupied ? 'Occupied' : 'Available'}
                      style={{
                        flexShrink: 0, width: 48, minHeight: 44, borderRadius: 10, cursor: 'pointer',
                        fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? 'var(--primary)' : isOccupied ? 'rgba(255,140,66,0.12)' : 'var(--input-bg)',
                        color:      isSelected ? 'white'          : isOccupied ? '#FF8C42'                : 'var(--text-muted)',
                        border:     isSelected ? '2px solid var(--primary)' : isOccupied ? '1px solid rgba(255,140,66,0.4)' : '1px solid var(--border)',
                        boxShadow:  isSelected ? '0 4px 12px var(--primary-border)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {t.tableNumber}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Customer info for Takeaway / Delivery */}
      {(orderType === 'Takeaway' || orderType === 'Delivery') && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', marginBottom: 7 }}>CUSTOMER INFO (OPTIONAL)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="text" placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', minHeight: 44 }} />
            <input type="text" placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', minHeight: 44 }} />
          </div>
        </div>
      )}

      {/* Order label */}
      <div style={{ padding: '8px 12px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif' }}>
          {currentOrderNum}{selectedTable ? ` · T${selectedTable}` : ''}
        </span>
        {cart.length > 0 && (
          <button onClick={clearCart} style={{ fontSize: 14, color: 'var(--red)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>CLEAR</button>
        )}
      </div>

      {/* Cart items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 6px' }}>
        {cart.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8, color: 'var(--text-dim)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)' }}>No items added</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cart.map((item, i) => (
              <div key={item.id} className="anim-right"
                style={{ animationDelay: `${i * 30}ms`, display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--input-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                {/* Thumbnail */}
                <div style={{ width: 42, height: 42, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.img ? (
                    <Image src={item.img} alt={item.name} width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--border)" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="var(--text-dim)"/><path d="M3 16l5-5 4 4 3-3 6 6" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                {/* Name + price */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{item.name}</p>
                  <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 800, margin: 0 }}>SR {(item.price * item.qty).toFixed(2)}</p>
                </div>
                {/* − qty + grouped control */}
                <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <button onClick={() => updateQty(item.id, -1)}
                    style={{ width: 44, height: 48, background: 'var(--card-bg)', border: 'none', color: 'var(--text-muted)', fontSize: 22, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
                    −
                  </button>
                  <div style={{ width: 46, height: 48, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>{item.qty}</span>
                  </div>
                  <button onClick={() => updateQty(item.id, 1)}
                    style={{ width: 44, height: 48, background: 'var(--primary)', border: 'none', color: '#fff', fontSize: 22, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.82'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mini totals */}
      {cart.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--input-bg)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>Subtotal</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>SR {subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 14, color: '#FF6B6B' }}>Discount ({discount}%)</span>
              <span style={{ fontSize: 14, color: '#FF6B6B', fontWeight: 700 }}>−SR {discAmt.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>TOTAL</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif' }}>SR {total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <ErrorBanner />

      {/* Action buttons */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={handleProceedCheckout} disabled={submitting || cart.length === 0}
          style={{ padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'Syne,sans-serif', cursor: cart.length > 0 && !submitting ? 'pointer' : 'not-allowed', transition: 'all 0.2s', border: 'none',
            background: cart.length > 0 ? 'linear-gradient(135deg,var(--primary),var(--primary-dim))' : 'var(--input-bg)',
            color: cart.length > 0 ? 'white' : 'var(--text-dim)',
            boxShadow: cart.length > 0 ? '0 4px 18px rgba(232,68,58,0.4)' : 'none', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? '⏳ Creating order…' : 'PROCEED TO CHECKOUT →'}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { lbl: '% Discount', fn: () => setShowDisc(true) },
            { lbl: '🖨 Print Bill', fn: () => cart.length > 0 && handlePrint() },
          ].map(({ lbl, fn }) => (
            <button key={lbl} onClick={fn}
              style={{ padding: '12px 8px', minHeight: 46, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ── renderCheckout ─────────────────────────────────────────────────────────
  const renderCheckout = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={() => setStep('order')}
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>CHECKOUT SUMMARY</h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 14, background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontFamily: 'Syne,sans-serif' }}>{currentOrderNum}</span>
          <span style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{orderType}{selectedTable ? ` · T${selectedTable}` : ''}</span>
          {createdOrderId && <span style={{ fontSize: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>✓ Order Created</span>}
        </div>
      </div>

      <DineInTableBanner />
      <ErrorBanner />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {isDineIn && selectedTable && (
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(232,68,58,0.1)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍽</div>
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: '0 0 2px' }}>DINE IN BILLING</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>
                Table <span style={{ color: 'var(--primary)' }}>{selectedTable}</span>
                {customerName && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', marginLeft: 8 }}>{customerName}</span>}
              </p>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif' }}>CASHIER</span>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700 }}>{cashierName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif' }}>TIME</span>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700 }}>{new Date().toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', marginBottom: 8 }}>ITEMS ({cart.reduce((s, i) => s + i.qty, 0)})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {cart.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', flexShrink: 0 }}>{item.qty}×</span>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700 }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>SR {(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { lbl: 'Subtotal', val: `SR ${subtotal.toFixed(2)}`, color: 'var(--text-muted)' },
            ...(discount > 0 ? [{ lbl: `Discount (${discount}%)`, val: `−SR ${discAmt.toFixed(2)}`, color: '#FF6B6B' }] : []),
            { lbl: 'VAT (15% incl.)', val: `SR ${taxAmt.toFixed(2)}`, color: 'var(--text-dim)' },
          ].map(r => (
            <div key={r.lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{r.lbl}</span>
              <span style={{ fontSize: 14, color: r.color, fontWeight: 700 }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--primary-bg)' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>TOTAL DUE</span>
              {isDineIn && selectedTable && <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 700, margin: '2px 0 0', letterSpacing: '0.06em', fontFamily: 'Syne,sans-serif' }}>TABLE {selectedTable} · DINE IN</p>}
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif' }}>SR {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setStep('payment')}
          style={{ padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '0.05em', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', boxShadow: '0 4px 18px rgba(232,68,58,0.4)' }}>
          💳 SELECT PAYMENT →
        </button>
        <button onClick={() => handlePrint()}
          style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>
          🖨 PRINT BILL PREVIEW
        </button>
      </div>
    </div>
  );

  // ── renderPayment ──────────────────────────────────────────────────────────
  const renderPayment = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setStep('checkout')}
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>PAYMENT</h3>
        </div>
      </div>

      <DineInTableBanner />
      <ErrorBanner />

      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: '0 0 4px' }}>
            AMOUNT DUE{isDineIn && selectedTable ? ` · TABLE ${selectedTable}` : ''}
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', margin: 0 }}>SR {total.toFixed(2)}</p>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', margin: 0 }}>PAYMENT METHOD</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {([
            { m: 'Cash',   icon: '💵', color: '#22C55E', sub: 'Physical cash' },
            { m: 'Card',   icon: '💳', color: '#60A5FA', sub: 'Debit / Credit' },
            { m: 'Online', icon: '📱', color: 'var(--primary)', sub: 'STC / Apple Pay' },
          ] as const).map(({ m, icon, color, sub }) => (
            <button key={m}
              onClick={() => { setPayMethod(m); if (m === 'Cash') { setStep('cash'); } else { finalizePay(m); } }}
              disabled={submitting}
              style={{ padding: '14px 6px', borderRadius: 12, border: `1.5px solid ${payMethod === m ? color : 'var(--border)'}`, background: payMethod === m ? `${color}18` : 'var(--input-bg)', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.18s', opacity: submitting ? 0.6 : 1 }}
              onMouseEnter={e => { if (!submitting) { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = `${color}12`; } }}
              onMouseLeave={e => { if (payMethod !== m) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--input-bg)'; } }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'Syne,sans-serif' }}>{m}</span>
              <span style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center' }}>{sub}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'Syne,sans-serif', margin: '0 0 8px' }}>QR ORDER</p>
          <button onClick={() => setShowQRScan(true)}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px dashed rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#60A5FA'; (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.06)'; }}>
            <span style={{ fontSize: 20 }}>📷</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#60A5FA', fontFamily: 'Syne,sans-serif', margin: 0 }}>SCAN QR ORDER</p>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>Customer scans & places order</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // ── renderCash ─────────────────────────────────────────────────────────────
  const renderCash = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setStep('payment')}
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: 0 }}>💵 CASH PAYMENT</h3>
        </div>
      </div>

      <DineInTableBanner />
      <ErrorBanner />

      <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', margin: '0 0 4px' }}>
            BILL AMOUNT{isDineIn && selectedTable ? ` · TABLE ${selectedTable}` : ''}
          </p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', margin: 0 }}>SR {total.toFixed(2)}</p>
        </div>

        <div>
          <label style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', display: 'block', marginBottom: 6 }}>CASH RECEIVED (SR)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#22C55E', fontFamily: 'Syne,sans-serif' }}>SR</span>
            <input type="number" min="0" placeholder="0.00" value={cashInput} onChange={e => setCashInput(e.target.value)} autoFocus
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, padding: '12px 12px 12px 44px', color: 'var(--text)', fontSize: 18, fontWeight: 800, outline: 'none', fontFamily: 'Syne,sans-serif', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 200) * 200]
            .filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(amt => (
              <button key={amt} onClick={() => setCashInput(String(amt))}
                style={{ padding: '12px 8px', minHeight: 46, borderRadius: 9, border: `1px solid ${cashInput === String(amt) ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, background: cashInput === String(amt) ? 'rgba(34,197,94,0.1)' : 'var(--input-bg)', color: cashInput === String(amt) ? '#22C55E' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif', transition: 'all 0.15s' }}>
                SR {amt}
              </button>
            ))}
        </div>

        {cashReceived >= total && (
          <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 12, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>💰 Change Due</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#60A5FA', fontFamily: 'Syne,sans-serif' }}>SR {change.toFixed(2)}</span>
          </div>
        )}
        {cashReceived > 0 && cashReceived < total && (
          <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: '#FF6B6B', fontWeight: 700 }}>⚠ Short by SR {(total - cashReceived).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div style={{ padding: 10, flexShrink: 0, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={() => { if (cashReceived >= total) finalizePay('Cash', cashReceived, change); }}
          disabled={submitting || cashReceived < total}
          style={{ padding: '12px', borderRadius: 10, border: 'none', cursor: cashReceived >= total && !submitting ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '0.05em',
            background: cashReceived >= total ? 'linear-gradient(135deg,#22C55E,#15803D)' : 'var(--input-bg)',
            color: cashReceived >= total ? 'white' : 'var(--text-dim)',
            boxShadow: cashReceived >= total ? '0 4px 16px rgba(34,197,94,0.3)' : 'none', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? '⏳ Processing…' : '✓ CONFIRM PAYMENT'}
        </button>
      </div>
    </div>
  );

  // ── renderDone ─────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 14px', gap: 14 }}>
      <div className="anim-scale" style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', margin: '0 0 4px' }}>Payment Complete!</p>
        <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 700, margin: 0 }}>SR {total.toFixed(2)}</p>
        {isDineIn && selectedTable && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '5px 14px', borderRadius: 20, background: 'rgba(232,68,58,0.12)', border: '1px solid var(--primary-border)' }}>
            <span style={{ fontSize: 14 }}>🍽</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Syne,sans-serif', letterSpacing: '0.06em' }}>TABLE {selectedTable} · DINE IN</span>
          </div>
        )}
        {paidInfo?.method === 'Cash' && (paidInfo.change || 0) > 0 && (
          <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, padding: '10px 20px', marginTop: 10 }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: '0 0 3px' }}>CHANGE DUE</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#60A5FA', fontFamily: 'Syne,sans-serif', margin: 0 }}>SR {(paidInfo.change || 0).toFixed(2)}</p>
          </div>
        )}
      </div>

      <button onClick={() => handlePrint(paidInfo?.method, paidInfo?.cash, paidInfo?.change)}
        style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em' }}>
        🖨 PRINT RECEIPT
      </button>

      <div style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px' }}>
        {[
          ['Order',    currentOrderNum],
          ['Type',     orderType],
          ...(isDineIn && selectedTable ? [['Table', `Table ${selectedTable}`]] : []),
          ...(customerName ? [['Customer', customerName]] : []),
          ['Cashier',  cashierName],
          ['Method',   paidInfo?.method || ''],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{k}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: k === 'Table' ? 'var(--primary)' : 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>

      <button onClick={resetAll}
        style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne,sans-serif', letterSpacing: '0.05em', boxShadow: '0 4px 16px rgba(232,68,58,0.3)' }}>
        + NEW ORDER
      </button>
    </div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      <aside className="order-panel" style={{ width: 420, background: 'var(--header-bg)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.3s', flexShrink: 0 }}>
        {step === 'order'    && renderCart()}
        {step === 'checkout' && renderCheckout()}
        {step === 'payment'  && renderPayment()}
        {step === 'cash'     && renderCash()}
        {step === 'done'     && renderDone()}
      </aside>

      {/* QR Scan Modal */}
      {showQRScan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowQRScan(false)}>
          <div className="anim-scale" style={{ background: 'var(--modal-bg)', border: '1px solid var(--primary-border)', borderRadius: 20, padding: '28px', width: 340, boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginBottom: 4 }}>📷 QR Order Scan</h3>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 18 }}>Show this QR code to the customer, or paste order data below</p>
            <div style={{ background: 'white', borderRadius: 12, padding: '14px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ width: 140, height: 140, margin: '0 auto', background: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 140'><rect width='140' height='140' fill='white'/><rect x='10' y='10' width='50' height='50' fill='none' stroke='black' stroke-width='4'/><rect x='20' y='20' width='30' height='30' fill='black'/><rect x='80' y='10' width='50' height='50' fill='none' stroke='black' stroke-width='4'/><rect x='90' y='20' width='30' height='30' fill='black'/><rect x='10' y='80' width='50' height='50' fill='none' stroke='black' stroke-width='4'/><rect x='20' y='90' width='30' height='30' fill='black'/><rect x='80' y='80' width='12' height='12' fill='black'/><rect x='96' y='80' width='12' height='12' fill='black'/><rect x='112' y='80' width='18' height='12' fill='black'/><rect x='80' y='96' width='18' height='12' fill='black'/><rect x='102' y='96' width='12' height='12' fill='black'/><rect x='118' y='96' width='12' height='18' fill='black'/><rect x='80' y='112' width='12' height='18' fill='black'/><rect x='96' y='114' width='24' height='12' fill='black'/></svg>`)}")`, backgroundSize: 'cover' }}></div>
              <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Table {selectedTable || 'Takeaway'} · SR {total.toFixed(2)}</p>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'Syne,sans-serif', marginBottom: 6 }}>OR ENTER ORDER DATA</p>
            <textarea value={qrOrderData} onChange={e => setQROrderData(e.target.value)}
              placeholder='Paste scanned QR data here…'
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 70, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 14 }} />
            <button onClick={() => { if (!qrOrderData.trim()) return; setQRProcessing(true); setTimeout(() => { setQRProcessing(false); setShowQRScan(false); setQROrderData(''); alert('✅ QR Order received!'); }, 1500); }} disabled={qrProcessing}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: qrProcessing ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', color: 'white', marginBottom: 8, opacity: qrProcessing ? 0.7 : 1 }}>
              {qrProcessing ? '⏳ Processing…' : '✓ CONFIRM ORDER'}
            </button>
            <button onClick={() => setShowQRScan(false)} style={{ width: '100%', padding: '9px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDisc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDisc(false)}>
          <div className="anim-scale" style={{ background: 'var(--modal-bg)', border: '1px solid var(--primary-border)', borderRadius: 20, padding: '28px', width: 290, boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', marginBottom: 4 }}>Apply Discount</h3>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 18 }}>Enter percentage (0–100)</p>
            <input type="number" min="0" max="100" value={discVal} onChange={e => setDiscVal(e.target.value)} placeholder="e.g. 10" autoFocus
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 16, fontWeight: 800, marginBottom: 14, outline: 'none', fontFamily: 'Syne,sans-serif', boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {[5, 10, 15, 20].map(p => (
                <button key={p} onClick={() => setDiscVal(String(p))}
                  style={{ padding: '11px 4px', minHeight: 44, borderRadius: 9, border: `1px solid ${discVal === String(p) ? 'var(--primary)' : 'var(--border)'}`, background: discVal === String(p) ? 'var(--primary-bg)' : 'var(--input-bg)', color: discVal === String(p) ? 'var(--primary)' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>
                  {p}%
                </button>
              ))}
            </div>
            <button onClick={applyDisc} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', background: 'linear-gradient(135deg,var(--primary),var(--primary-dim))', color: 'white', marginBottom: 8 }}>Apply</button>
            <button onClick={() => setShowDisc(false)} style={{ width: '100%', padding: '9px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}