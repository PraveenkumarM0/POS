"use client";
import api from "@/lib/api";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "superadmin" | "cashier" | "cook";

export type POSUser = {
  [x: string]: any;
  isActive: any;
  pin: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cashierId: string;
  createdAt: string;
  active: boolean;
  permissions?: string[];
};

export type ShiftRecord = {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  cashierId: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  sales: number;
  transactions: number;
  ordersCompleted?: number;
  status: "active" | "closed";
};

export type CustomerRecord = {
  id: string;
  name: string;
  orderNum: string;
  orderType: string;
  tableNum?: number | null;
  total: number;
  payMethod: string;
  time: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
};

export type Session = {
  user: POSUser;
  shiftId: string;
  openingCash: number;
  startTime: string;
  sales: number;
  transactions: number;
  cashTransactions: {
    id: string;
    amount: number;
    cash: number;
    change: number;
    time: string;
    items: number;
  }[];
};

type AuthCtx = {
  session: Session | null;
  shifts: ShiftRecord[];
  customers: CustomerRecord[];
  loginAdmin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginCashier: (pin: string, openingCash: number) => Promise<{ ok: boolean; error?: string }>;
  loginCook: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  addSale: (amount: number, cash: number, change: number, items: number) => void;
  addCustomer: (c: Omit<CustomerRecord, "id">) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCook: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  // Restore session on page reload
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/auth/me")
      .then(async (res: { data: { data: any } }) => {
        const raw = res.data.data;
        const user = { ...raw, name: raw.fullName ?? raw.name ?? "" };

        let shiftId = "";
        let openingCash = 0;
        let startTime = new Date().toISOString();

        // Admin/superadmin have no shift — only cashier/cook do
        if (raw.role !== "admin" && raw.role !== "superadmin") {
          try {
            const shiftRes = await api.get("/shifts/current");
            const shift = shiftRes.data.data;
            if (shift) {
              shiftId    = shift._id ?? "";
              openingCash = shift.openingFloat ?? 0;
              startTime  = shift.openedAt ?? new Date().toISOString();
            }
          } catch {
            // no open shift — leave defaults
          }
        }

        setSession({ user, shiftId, openingCash, startTime, sales: 0, transactions: 0, cashTransactions: [] });
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
      });
  }, []);

  // ── Admin login — no shift, just authenticate ──────────────────────────────
  const loginAdmin = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const raw   = response.data.data.user;
      const user  = { ...raw, name: raw.fullName ?? raw.name ?? "" };
      const token = response.data.data.accessToken;

      localStorage.setItem("role", user.role);
      localStorage.setItem("token", token);

      setSession({
        user,
        shiftId:     "",
        openingCash: 0,
        startTime:   new Date().toISOString(),
        sales: 0, transactions: 0, cashTransactions: [],
      });

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.response?.data?.message || "Login failed" };
    }
  };

  // ── Cashier login — backend opens DB shift, returns it ─────────────────────
  const loginCashier = async (pin: string, openingCash: number): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await api.post("/auth/pin-login", { pin, openingFloat: openingCash });
      const raw   = response.data.data.user;
      const user  = { ...raw, name: raw.fullName ?? raw.name ?? "" };
      const token = response.data.data.accessToken;
      const shift = response.data.data.shift;

      localStorage.setItem("role", user.role);
      localStorage.setItem("token", token);

      setSession({
        user,
        shiftId:     shift?._id      ?? "",
        openingCash: shift?.openingFloat ?? openingCash,
        startTime:   shift?.openedAt ?? new Date().toISOString(),
        sales: 0, transactions: 0, cashTransactions: [],
      });

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.response?.data?.message || "PIN Login failed" };
    }
  };

  // ── Cook login — backend opens DB shift (no opening float for cooks) ────────
  const loginCook = async (pin: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await api.post("/auth/pin-login", { pin, openingFloat: 0 });
      const raw   = response.data.data.user;
      const user  = { ...raw, name: raw.fullName ?? raw.name ?? "" };
      const token = response.data.data.accessToken;
      const shift = response.data.data.shift;

      localStorage.setItem("role", user.role);
      localStorage.setItem("token", token);

      setSession({
        user,
        shiftId:     shift?._id  ?? "",
        openingCash: 0,
        startTime:   shift?.openedAt ?? new Date().toISOString(),
        sales: 0, transactions: 0, cashTransactions: [],
      });

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.response?.data?.message || "Cook Login failed" };
    }
  };

  // ── Logout — backend closes shift for cashier/cook ─────────────────────────
  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clear local state regardless
    }
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setSession(null);
    setCustomers([]);
  };

  // ── Track sales in session (for live totals in the report tab) ─────────────
  const addSale = (amount: number, cash: number, change: number, items: number) => {
    const tx = {
      id:     `TXN-${String(Date.now()).slice(-6)}`,
      amount, cash, change, items,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setSession((prev) =>
      prev
        ? { ...prev, sales: prev.sales + amount, transactions: prev.transactions + 1, cashTransactions: [tx, ...prev.cashTransactions] }
        : prev,
    );
  };

  const addCustomer = (c: Omit<CustomerRecord, "id">) => {
    setCustomers((prev) => [{ ...c, id: `CUST-${Date.now()}` }, ...prev]);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        shifts: [],       // no longer tracked locally — use the Shifts tab API
        customers,
        loginAdmin,
        loginCashier,
        loginCook,
        logout,
        addSale,
        addCustomer,
        isAdmin:      session?.user?.role === "admin" || session?.user?.role === "superadmin",
        isSuperAdmin: session?.user?.role === "superadmin",
        isCook:       session?.user?.role === "cook",
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
