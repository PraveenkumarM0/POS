'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  img: string;
  qty: number;
};

type CartCtx = {
  cart: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[]) => void;
  discount: number;
  setDiscount: (v: number) => void;
  orderType: string;
  setOrderType: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  subtotal: number;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [orderType, setOrderType] = useState('Takeaway');
  const [customerName, setCustomerName] = useState('');

  const addItem = (item: Omit<CartItem, 'qty'>) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  };

  const clearCart = () => { setCart([]); setDiscount(0); };
  const loadItems = (items: CartItem[]) => setCart(items);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal - subtotal * discount / 100;

  return (
    <Ctx.Provider value={{ cart, addItem, updateQty, clearCart, loadItems, discount, setDiscount, orderType, setOrderType, customerName, setCustomerName, subtotal, total }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
};
