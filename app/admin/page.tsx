"use client";
import api from "@/lib/api";
import { message } from "antd";
import { useState, useEffect, Key } from "react";
import "./admin.css";
import {
  useAuth,
  type UserRole,
} from "@/lib/AuthContext";

type AddForm = {
  fullname: string;
  email: string;
  password: string;
  pin: string;
  role: UserRole | "waiter";
  cashierId: string;
  permissions: string[];
  isActive: boolean;
  branch: string;
};

const DUMMY_BRANCHES = [
  { id: "dummy-1", name: "Main Branch" },
  { id: "dummy-2", name: "Downtown Branch" },
  { id: "dummy-3", name: "Mall Branch" },
  { id: "dummy-4", name: "Airport Branch" },
  { id: "dummy-5", name: "North Branch" },
];


const ROLE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  admin:   { color: "var(--primary)",   bg: "rgba(212,160,23,0.12)",  label: "Admin"   },
  cashier: { color: "#60A5FA",          bg: "rgba(96,165,250,0.12)",  label: "Cashier" },
  cook:    { color: "#22C55E",          bg: "rgba(34,197,94,0.12)",   label: "Cook"    },
  waiter:  { color: "#F472B6",          bg: "rgba(244,114,182,0.12)", label: "Waiter"  },
};

function StatBox({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"18px 20px", border:"1px solid var(--border)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
        <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.1em", fontFamily:"Syne,sans-serif" }}>{label}</p>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <p style={{ fontSize:26, fontWeight:800, color, fontFamily:"Syne,sans-serif" }}>{value}</p>
      {sub && <p style={{ fontSize:14, color:"var(--text-muted)", marginTop:4 }}>{sub}</p>}
    </div>
  );
}

const ACCESS_MODULES = ["menu","tables","orders","online","kds","procurement","admin"];

export default function AdminPage() {
  const { session, isAdmin, isSuperAdmin: ctxIsSuperAdmin, isCook, logout } = useAuth();

  const [tab, setTab] = useState<"dashboard"|"report"|"users"|"shifts">("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo,   setReportDateTo]   = useState("");
  const [reportType, setReportType] = useState<"cashier"|"cook">("cashier");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>(DUMMY_BRANCHES);
  const [dashBranchFilter, setDashBranchFilter] = useState<string>("all");
  const [txDateFilter, setTxDateFilter] = useState<string>("");

  const loadBranches = async () => {
    // Branch API integration commented out — using static dummy data
    // try {
    //   const res = await api.get("/branches");
    //   const data = res.data?.data ?? res.data?.branches ?? res.data ?? [];
    //   const mapped = (Array.isArray(data) ? data : []).map((b: any) => ({
    //     id: b._id || b.id,
    //     name: b.name || "",
    //   })).filter((b: any) => b.id && b.name);
    //   setBranches(mapped.length > 0 ? mapped : DUMMY_BRANCHES);
    // } catch {
    //   setBranches(DUMMY_BRANCHES);
    // }
    setBranches(DUMMY_BRANCHES);
  };

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    pin: "",
    role: "cashier" as UserRole | "waiter",
    cashierId: "",
    permissions: [] as string[],
    isActive: true,
    branch: "",
  });

  const [editForm, setEditForm] = useState<Partial<AddForm>>({
    fullname: "",
    email: "",
    password: "",
    pin: "",
    role: "cashier" as UserRole | "waiter",
    cashierId: "",
    permissions: [],
    isActive: true,
    branch: "",
  });

  const [formErr,       setFormErr]       = useState("");
  const [confirmDel,    setConfirmDel]    = useState<string | null>(null);
  const [cashEntry,     setCashEntry]     = useState("");
  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedTx,    setSelectedTx]    = useState<string | null>(null);
  const [users,         setUsers]         = useState<any[]>([]);

  const [dashData,      setDashData]      = useState<any>(null);
  const [dashLoading,   setDashLoading]   = useState(false);
  const [payBreakdown,  setPayBreakdown]  = useState({ cash:0, card:0, online:0 });
  const [recentOrders,  setRecentOrders]  = useState<any[]>([]);
  const [apiShifts,     setApiShifts]     = useState<any[]>([]);
  const [cashierReport,    setCashierReport]    = useState<any>(null);
  const [cookReport,       setCookReport]       = useState<any>(null);
  const [reportLoading,    setReportLoading]    = useState(false);
  const [reportShifts,     setReportShifts]     = useState<any[]>([]);
  const [selectedShiftId,  setSelectedShiftId]  = useState<string>("");
  const [liveOrders,    setLiveOrders]    = useState<any[]>([]);
  const [tableList,     setTableList]     = useState<any[]>([]);
  const [branchStats,   _setBranchStats]  = useState<Record<string,any>>({});
  const [procRequests,    setProcRequests]    = useState<any[]>([]);
  const [procLoading,     setProcLoading]     = useState(false);
  const [selectedProcReq, setSelectedProcReq] = useState<any>(null);
  const [liveAt,       setLiveAt]       = useState<Date | null>(null);
  const [dashSubTab,   setDashSubTab]   = useState<"overview"|"live"|"tables">("overview");
  const [dashDateFrom, setDashDateFrom] = useState("");
  const [dashDateTo,   setDashDateTo]   = useState("");

  if (!session) return null;

  const now   = new Date();
  const start = new Date(session.startTime);
  const diffMs  = now.getTime() - start.getTime();
  const hours   = Math.floor(diffMs / 3600000);
  const mins    = Math.floor((diffMs % 3600000) / 60000);
  const duration = `${hours}h ${mins}m`;

  const apiCashReg    = dashData?.cashRegister;
  const openingFloat  = apiCashReg?.openingFloat  ?? session.openingCash;
  const cashSalesAmt  = apiCashReg?.cashSales      ?? payBreakdown.cash;
  const expectedClose = apiCashReg?.expectedClose  ?? (session.openingCash + session.sales);
  const cashBalance   = apiCashReg?.currentBalance ?? (session.openingCash + session.sales);

  const todayRevenue = dashData?.today?.revenue ?? 0;
  const todayOrders  = dashData?.today?.totalOrders ?? 0;
  const breakdown = [
    { method:"Cash",   amount:payBreakdown.cash,   icon:"💵", color:"#22C55E" },
    { method:"Card",   amount:payBreakdown.card,   icon:"💳", color:"#60A5FA" },
    { method:"Online", amount:payBreakdown.online, icon:"💱", color:"#A78BFA" },
  ];
  const totalRevenue = breakdown.reduce((s, b) => s + b.amount, 0);

  const crStats       = cashierReport?.stats ?? cashierReport?.summary ?? cashierReport?.data?.stats ?? cashierReport?.cashierStats ?? cashierReport?.report ?? {};
  const crCash        = cashierReport?.cashRegister ?? cashierReport?.cash ?? cashierReport?.data?.cashRegister ?? cashierReport?.register ?? cashierReport?.cashInfo ?? {};
  const crOpening     = crCash?.openingFloat  ?? crCash?.opening  ?? crCash?.openingBalance ?? session.openingCash;
  const crTotal       = crStats?.totalRevenue ?? crStats?.revenue ?? crStats?.totalSales     ?? cashierReport?.totalRevenue ?? session.sales;
  const crExpect      = crCash?.expectedClose ?? crCash?.expected ?? crCash?.expectedClosing ?? expectedClose;
  const crAvg         = crStats?.avgOrder     ?? crStats?.averageOrder ?? crStats?.avgOrderValue ?? (session.transactions > 0 ? session.sales / session.transactions : 0);
  const crCashSales   = crCash?.cashSales   ?? crCash?.cash   ?? crStats?.cash   ?? 0;
  const crCardSales   = crCash?.cardSales   ?? crCash?.card   ?? crStats?.card   ?? 0;
  const crOnlineSales = crCash?.onlineSales ?? crCash?.online ?? crStats?.online ?? 0;

  const crBreakdown = [
    { method:"Cash",   amount:crCashSales,   icon:"💵", color:"#22C55E" },
    { method:"Card",   amount:crCardSales,   icon:"💳", color:"#60A5FA" },
    { method:"Online", amount:crOnlineSales, icon:"💱", color:"#A78BFA" },
  ];

  const reportShift     = cashierReport?.shift ?? cashierReport?.data?.shift ?? cashierReport?.shiftData ?? null;
  const reportShiftUser = reportShift?.cashier ?? reportShift?.openedBy ?? reportShift?.user ?? reportShift?.staff ?? {};
  const reportStartDate = reportShift?.openedAt ? new Date(reportShift.openedAt) : start;
  const reportEndDate   = reportShift?.closedAt ? new Date(reportShift.closedAt) : new Date();
  const reportDiffMs    = reportEndDate.getTime() - reportStartDate.getTime();
  const reportDuration  = reportShift
    ? `${Math.floor(reportDiffMs / 3600000)}h ${Math.floor((reportDiffMs % 3600000) / 60000)}m`
    : duration;
  const reportStartStr  = reportStartDate.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const reportCashierName = reportShiftUser.fullName ?? reportShiftUser.name ?? reportShiftUser.fullname ?? reportShiftUser.displayName ??
                            reportShift?.userName ?? reportShift?.cashierName ?? reportShift?.staffName ?? cashierReport?.cashierName;
  const reportCashierId   = reportShiftUser.cashierId ?? reportShiftUser.cashier_id ?? reportShiftUser.employeeId ??
                            reportShift?.cashierId ?? reportShift?.userId ?? "";
  const reportCashier  = reportCashierName
    ? `${reportCashierName} (${reportCashierId})`
    : `${session.user.name} (${session.user.cashierId})`;
  const reportRole = reportShiftUser.role ?? reportShift?.role ?? session.user.role;

  const apiRecentOrders: any[] = cashierReport?.recentOrders ?? cashierReport?.orders ?? cashierReport?.transactions ?? cashierReport?.data?.recentOrders ?? [];
  const billingTxns = apiRecentOrders.map((o: any) => ({
    id:     `#${o.posOrderNumber ?? "—"}`,
    amount: o.total         ?? 0,
    cash:   o.cashReceived  ?? (o.paymentMethod === "cash" ? o.total : 0),
    change: o.changeGiven   ?? 0,
    time:   o.paidAt ? new Date(o.paidAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—",
    items:  Array.isArray(o.items) ? o.items.length : 0,
  }));
  const billingTotal       = billingTxns.reduce((s, t) => s + t.amount, 0);
  const billingCashTotal   = billingTxns.reduce((s, t) => s + t.cash,   0);
  const billingChangeTotal = billingTxns.reduce((s, t) => s + t.change, 0);

  const isSuperAdmin = ctxIsSuperAdmin || (isAdmin && !session.user.branch);

  const handleAddUser = async () => {
    try {
      setFormErr("");
      const isWaiter = form.role === "waiter";
      const payload: any = {
        fullName:    form.fullname.trim(),
        email:       isWaiter ? `waiter-${Date.now()}@internal` : form.email.trim().toLowerCase(),
        password:    isWaiter ? `waiter-${Date.now()}` : form.password.trim(),
        pin:         form.pin.trim(),
        role:        form.role,
        cashierId:   form.cashierId.trim().toUpperCase(),
        permissions: form.permissions || [],
        isActive:    true,
        branch:      form.branch,
      };
      if (!payload.fullName || !payload.pin || !payload.cashierId || !payload.role) {
        setFormErr("Full Name, Cashier ID, PIN and Role are required."); return;
      }
      if (!isWaiter && (!form.email.trim() || !form.password.trim())) {
        setFormErr("Email and Password are required for non-waiter roles."); return;
      }
      if (payload.pin.length < 4) { setFormErr("PIN must be at least 4 digits."); return; }
      if (!isWaiter && !form.email.includes("@")) { setFormErr("Invalid email address."); return; }
      if (payload.permissions.length === 0) payload.permissions = ["menu"];
      await api.post("/users", payload);
      await loadUsers();
      setShowAdd(false);
      setForm({ fullname:"", email:"", password:"", pin:"", role:"cashier" as UserRole, cashierId:"", permissions:[], isActive:true, branch:"" });
      setFormErr("");
      message.success('User created successfully');
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Failed to create user";
      setFormErr(errMsg);
      message.error(errMsg);
    }
  };

  const handlePrint = () => window.print();

  const adminTabs = isAdmin
    ? (["dashboard","report","shifts","users"] as const)
    : (["report"] as const);

  const tabLabels: Record<string, string> = {
    dashboard: "DASHBOARD",
    report:    "REPORTS",
    shifts:    "SHIFTS",
    users:     "👥 USERS",
  };

  const effectiveReportType = isCook ? "cook" : reportType;

  const updateUserData = async (id: string, payload: Record<string, any>) => {
    try {
      await api.patch(`/users/${id}`, payload);
      await loadUsers();
      setEditUserId(null);
      message.success('User updated successfully');
    } catch (error) {
      console.error(error);
      message.error('Failed to update user');
    }
  };

  const deleteUserData = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      await loadUsers();
      setConfirmDel(null);
      message.success('User deleted');
    } catch (error) {
      console.log(error);
      message.error('Failed to delete user');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get("/users", { params:{ page:1, limit:20 } });
      if (!response?.data) return;
      const apiUsers = response.data.data || response.data.users || [];
      setUsers(apiUsers.map((u: any) => ({
        ...u,
        id:          u._id || u.id,
        name:        u.fullName || "",
        fullname:    u.fullName || "",
        isActive:    typeof u.isActive === "boolean" ? u.isActive : true,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        role:        u.role      || "cashier",
        cashierId:   u.cashierId || "",
        email:       u.email     || "",
        pin:         u.pin       || "",
        branch:      u.branch    || "",
      })));
    } catch (error) { console.log("LOAD USERS ERROR:", error); }
  };

  useEffect(() => { loadUsers(); loadBranches(); }, []);

  useEffect(() => {
    if (!session) {
      setDashData(null);
      setPayBreakdown({ cash:0, card:0, online:0 });
      setRecentOrders([]);
      setApiShifts([]);
      setCashierReport(null);
      setCookReport(null);
      setUsers([]);
      setTab("dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const loadDashboard = async (branch = dashBranchFilter, dateFrom = dashDateFrom, dateTo = dashDateTo): Promise<string | undefined> => {
    setDashLoading(true);
    let shiftId: string | undefined;
    try {
      const params: any = {};
      // Branch filter param commented out — dashboard branch integration disabled
      // if (branch && branch !== "all") params.branch = branch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res  = await api.get("/dashboard", { params });
      const data = res.data.data;
      shiftId = data?.currentShift?._id;
      if (data) {
        setDashData(data);
        setPayBreakdown({ cash:data.paymentBreakdown?.cash??0, card:data.paymentBreakdown?.card??0, online:data.paymentBreakdown?.online??0 });
        setRecentOrders(Array.isArray(data.recentTransactions) ? data.recentTransactions.slice(0, 8) : []);
      }
    } catch (err) { console.error("DASHBOARD LOAD ERROR:", err); }
    setDashLoading(false);
    return shiftId;
  };

  const loadCashierReport = async (shiftId: string, dateFrom = "", dateTo = "") => {
    if (!shiftId) return;
    setReportLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await api.get(`/shifts/${shiftId}/cashier-report`, { params });
      console.log("[cashier-report] raw response:", JSON.stringify(res.data, null, 2));
      setCashierReport(res.data.data ?? res.data ?? null);
    } catch (err) { console.error("CASHIER REPORT ERROR:", err); }
    setReportLoading(false);
  };

  const loadCookReport = async (shiftId: string) => {
    if (!shiftId) return;
    try {
      const res = await api.get(`/shifts/${shiftId}/cook-report`);
      console.log("[cook-report] raw response:", JSON.stringify(res.data, null, 2));
      setCookReport(res.data.data ?? res.data ?? null);
    } catch (err) { console.error("COOK REPORT ERROR:", err); }
  };

  const initReport = async () => {
    setCashierReport(null);
    setCookReport(null);
    if (isAdmin) {
      // Admin: fetch all recent shifts and auto-select the most recent one
      try {
        const res = await api.get("/shifts", { params: { page: 1, limit: 20 } });
        console.log("[initReport] shifts raw response:", JSON.stringify(res.data, null, 2));
        // handle both {data:[...]} and {data:{shifts:[...], data:[...]}}
        const _rawData = res.data.data;
        const shifts: any[] = Array.isArray(_rawData) ? _rawData : (_rawData?.shifts ?? _rawData?.data ?? res.data.shifts ?? []);
        setReportShifts(shifts);
        if (shifts.length > 0) {
          const firstId = shifts[0]._id;
          setSelectedShiftId(firstId);
          await Promise.all([
            loadCashierReport(firstId, reportDateFrom, reportDateTo),
            loadCookReport(firstId),
          ]);
        }
      } catch (err) { console.error("INIT REPORT ERROR:", err); }
    } else {
      // Cashier: use session shiftId, or fetch their most recent open shift
      let shiftId: string = (session as any)?.shiftId ?? "";
      if (!shiftId) {
        try {
          const res = await api.get("/shifts", { params: { page: 1, limit: 1, status: "open" } });
          const _d = res.data.data;
          const _arr = Array.isArray(_d) ? _d : (_d?.shifts ?? _d?.data ?? []);
          shiftId = _arr[0]?._id ?? "";
        } catch {}
      }
      if (shiftId) {
        setSelectedShiftId(shiftId);
        await Promise.all([
          loadCashierReport(shiftId, reportDateFrom, reportDateTo),
          loadCookReport(shiftId),
        ]);
      }
    }
  };

  const [shiftsPage,    setShiftsPage]    = useState(1);
  const [shiftsTotalPg, setShiftsTotalPg] = useState(1);
  const [shiftDateFrom, setShiftDateFrom] = useState("");
  const [shiftDateTo,   setShiftDateTo]   = useState("");
  const SHIFTS_PER_PAGE = 8;

  const [usersPage,  setUsersPage]  = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const USERS_PER_PAGE = 6;

  const [shiftsLoading, setShiftsLoading] = useState(false);

  const loadShifts = async (page = shiftsPage, dFrom = shiftDateFrom, dTo = shiftDateTo) => {
    setShiftsLoading(true);
    try {
      const params: any = { page, limit: SHIFTS_PER_PAGE };
      if (dFrom) params.dateFrom = dFrom;
      if (dTo)   params.dateTo   = dTo;
      const res = await api.get("/shifts", { params });
      console.log("[loadShifts] raw response:", JSON.stringify(res.data, null, 2));
      const _rawS = res.data?.data;
      const data = Array.isArray(_rawS) ? _rawS : (_rawS?.shifts ?? _rawS?.data ?? res.data?.shifts ?? []);
      setApiShifts(Array.isArray(data) ? data : []);
      const pagination = res.data?.pagination ?? res.data?.meta;
      if (pagination?.totalPages) setShiftsTotalPg(pagination.totalPages);
      else if (pagination?.total) setShiftsTotalPg(Math.ceil(pagination.total / SHIFTS_PER_PAGE));
      else setShiftsTotalPg(1);
    } catch (err) { console.error("SHIFTS LOAD ERROR:", err); }
    setShiftsLoading(false);
  };

  const loadLiveOrders = async () => {
    try {
      const params: any = { limit:50 };
      // Branch filter param commented out — live orders branch integration disabled
      // if (dashBranchFilter && dashBranchFilter !== "all") params.branch = dashBranchFilter;
      const today = new Date(); today.setHours(0,0,0,0);
      params.dateFrom = today.toISOString();
      const res  = await api.get("/orders", { params });
      setLiveOrders(res.data.data ?? []);
      setLiveAt(new Date());
    } catch {}
  };

  const loadTables = async () => {
    try {
      const params: any = {};
      // Branch filter param commented out — tables branch integration disabled
      // if (dashBranchFilter && dashBranchFilter !== "all") params.branch = dashBranchFilter;
      const res = await api.get("/tables", { params });
      setTableList(res.data.data ?? []);
    } catch { setTableList([]); }
  };

  const loadProcRequests = async () => {
    setProcLoading(true);
    try {
      const res  = await api.get("/procurement?all=1");
      const data: any[] = res.data.data ?? res.data ?? [];
      setProcRequests(data);
    } catch {}
    setProcLoading(false);
  };


  useEffect(() => {
    if (tab === "dashboard") loadDashboard();
    if (tab === "report")    initReport();
    if (tab === "shifts")  { setShiftsPage(1); loadShifts(1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "report" || !selectedShiftId) return;
    loadCashierReport(selectedShiftId, reportDateFrom, reportDateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDateFrom, reportDateTo]);

  // Branch filter dashboard reload commented out — branch-based dashboard API integration disabled
  // useEffect(() => {
  //   if (tab === "dashboard") loadDashboard(dashBranchFilter, dashDateFrom, dashDateTo);
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [dashBranchFilter, dashDateFrom, dashDateTo]);
  useEffect(() => {
    if (tab === "dashboard") loadDashboard("all", dashDateFrom, dashDateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashDateFrom, dashDateTo]);

  useEffect(() => {
    if (tab !== "dashboard") return;
    loadLiveOrders();
    loadTables();
    if (isAdmin) loadProcRequests();
    const ot = setInterval(loadLiveOrders, 20000);
    const tt = setInterval(loadTables,     15000);
    return () => { clearInterval(ot); clearInterval(tt); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dashBranchFilter]);


  return (
    <div style={{ height:"100%", overflow:"hidden", display:"flex", flexDirection:"column", background:"var(--bg)" }}>

      {/* ── Header ── */}
      <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background: isAdmin ? "var(--primary-bg)" : "rgba(96,165,250,0.15)", border:`1px solid ${isAdmin ? "var(--primary-border)" : "rgba(96,165,250,0.3)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke={isAdmin ? "var(--primary)" : "#60A5FA"} strokeWidth="2"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={isAdmin ? "var(--primary)" : "#60A5FA"} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize:14, color: isAdmin ? "var(--primary)" : "#60A5FA", fontWeight:700, letterSpacing:"0.12em", fontFamily:"Syne,sans-serif", marginBottom:1 }}>
              {isSuperAdmin ? "🌐 SUPER ADMIN PANEL" : isAdmin ? "🛡 ADMIN PANEL" : "👤 CASHIER PANEL"}
            </p>
            <h1 style={{ fontSize:16, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif" }}>
              {session.user.name} · {session.user.cashierId}
            </h1>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ display:"flex", background:"var(--input-bg)", borderRadius:10, padding:3, border:"1px solid rgba(255,255,255,0.07)" }}>
            {adminTabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"10px 16px", minHeight:40, borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"Syne,sans-serif", letterSpacing:"0.05em", transition:"all 0.15s",
                  background: tab === t ? "var(--primary)" : "transparent",
                  color:      tab === t ? "var(--bg)"      : "var(--text-dim)", whiteSpace:"nowrap" }}>
                {tabLabels[t]}
              </button>
            ))}
          </div>
          <button onClick={logout}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 16px", minHeight:44, borderRadius:10, border:"1px solid rgba(255,68,68,0.3)", background:"rgba(255,68,68,0.08)", color:"#FF6B6B", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isAdmin || isCook ? "LOGOUT" : "CLOSE SHIFT"}
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

        {/* ══════════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════════ */}
        {tab === "dashboard" && isAdmin && (
          <>
            {/* Toolbar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              {/* Sub-tab pills */}
              {/* <div style={{ display:"flex", gap:4, background:"var(--input-bg)", borderRadius:10, padding:3, border:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
                {(["overview","live","tables"] as const).map(st => (
                  <button key={st} onClick={() => setDashSubTab(st)}
                    style={{ padding:"10px 18px", minHeight:40, borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"Syne,sans-serif", letterSpacing:"0.05em", transition:"all 0.15s",
                      background: dashSubTab === st ? "var(--primary)" : "transparent",
                      color:      dashSubTab === st ? "var(--bg)"      : "var(--text-dim)", whiteSpace:"nowrap" }}>
                    {st === "overview" ? "📊 OVERVIEW" : st === "live" ? "🔴 LIVE ORDERS" : "🪑 TABLES"}
                    {st === "overview" ? "📊 OVERVIEW" : st === "live" ? "" : ""}
                  </button>
                ))}
              </div> */}

              {/* Right controls */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 0 3px rgba(34,197,94,0.2)" }} />
                  <span style={{ fontSize:14, color:"#22C55E", fontWeight:700, fontFamily:"Syne,sans-serif" }}>LIVE</span>
                </div>
                {isSuperAdmin && (
                  <select value={dashBranchFilter} onChange={e => setDashBranchFilter(e.target.value)}
                    style={{ background:"var(--input-bg)", border:`1px solid ${dashBranchFilter!=="all"?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"8px 12px", minHeight:40, color: dashBranchFilter!=="all" ? "var(--primary)" : "var(--text)", fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                    <option value="all">All Branches</option>
                    {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                  </select>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>FROM</span>
                  <input type="date" value={dashDateFrom} onChange={e => setDashDateFrom(e.target.value)}
                    style={{ background:"var(--input-bg)", border:`1px solid ${dashDateFrom?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"8px 10px", minHeight:40, color:"var(--text)", fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit", colorScheme:"dark" }} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>TO</span>
                  <input type="date" value={dashDateTo} onChange={e => setDashDateTo(e.target.value)}
                    style={{ background:"var(--input-bg)", border:`1px solid ${dashDateTo?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"8px 10px", minHeight:40, color:"var(--text)", fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit", colorScheme:"dark" }} />
                </div>
                <button onClick={() => { setDashDateFrom(""); setDashDateTo(""); }}
                  disabled={!dashDateFrom && !dashDateTo}
                  style={{ padding:"8px 12px", minHeight:40, borderRadius:7, border:"1px solid var(--border)", background:(dashDateFrom||dashDateTo)?"var(--primary)":"transparent", color:(dashDateFrom||dashDateTo)?"#fff":"var(--text-dim)", fontSize:14, fontWeight:700, cursor:(dashDateFrom||dashDateTo)?"pointer":"default", fontFamily:"Syne,sans-serif", opacity:(dashDateFrom||dashDateTo)?1:0.4, transition:"all 0.15s" }}>
                  Clear ×
                </button>
              </div>
            </div>

            {/* ── OVERVIEW ── */}
            {dashSubTab === "overview" && (
              <>
                {/* KPI row */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                  <StatBox label="TOTAL REVENUE"  value={dashLoading ? "…" : `SR ${todayRevenue.toFixed(0)}`}              sub="Today (completed orders)" color="var(--primary)" icon="💰" />
                  <StatBox label="CASH IN DRAWER" value={dashLoading ? "…" : `SR ${cashBalance.toFixed(0)}`}               sub={`Opening: SR ${openingFloat}`} color="#22C55E" icon="💵" />
                  <StatBox label="TOTAL ORDERS"   value={dashLoading ? "…" : todayOrders}                                  sub="Today"   color="#60A5FA" icon="🛒" />
                  <StatBox label="ACTIVE ORDERS"  value={dashLoading ? "…" : (dashData?.today?.activeOrders ?? 0)}         sub={`${duration} shift`} color="#A78BFA" icon="🧾" />
                </div>

                {/* Branch performance (super admin) */}
                {isSuperAdmin && dashBranchFilter === "all" && branches.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:14 }}>🌐 BRANCH PERFORMANCE — TODAY</p>
                    <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(branches.length,5)},1fr)`, gap:12, alignItems:"stretch" }}>
                      {branches.map(br => {
                        const bs  = branchStats[br.id];
                        const rev = bs?.today?.revenue ?? 0;
                        const ord = bs?.today?.totalOrders ?? 0;
                        const act = bs?.today?.activeOrders ?? 0;
                        const pay = bs?.paymentBreakdown ?? {};
                        const topType = bs?.recentTransactions
                          ? Object.entries(
                              (bs.recentTransactions as any[]).reduce((m:any,o:any)=>{ const t=(o.orderType??"other"); m[t]=(m[t]??0)+1; return m; },{})
                            ).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0]
                          : null;
                        return (
                          <div key={br.id} onClick={() => setDashBranchFilter(br.id)}
                            style={{ background:"var(--card-bg)", borderRadius:12, padding:"16px", border:`1px solid ${dashBranchFilter===br.id?"var(--primary-border)":"rgba(255,255,255,0.06)"}`, cursor:"pointer", transition:"all 0.15s", position:"relative", overflow:"hidden", minHeight:140, display:"flex", flexDirection:"column" }}>
                            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,var(--primary),transparent)" }} />
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                              <span style={{ fontSize:14, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"calc(100% - 52px)" }}>🏪 {br.name}</span>
                              {act > 0 && <span style={{ fontSize:14, fontWeight:800, color:"#22C55E", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", padding:"2px 6px", borderRadius:20, fontFamily:"Syne,sans-serif" }}>{act} LIVE</span>}
                            </div>
                            <p style={{ fontSize:24, fontWeight:800, color:"var(--primary)", fontFamily:"Syne,sans-serif", margin:"0 0 2px" }}>SR {rev.toFixed(0)}</p>
                            <p style={{ fontSize:14, color:"var(--text-dim)", margin:"0 0 8px" }}>{ord} orders today</p>
                            <div style={{ marginTop:"auto", paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: topType ? 4 : 0 }}>
                                {[["💵",pay.cash??0,"#22C55E"],["💳",pay.card??0,"#60A5FA"],["📱",pay.online??0,"#A78BFA"]].map(([icon,val,col])=>(
                                  <span key={String(icon)} style={{ fontSize:14, color:String(col), fontFamily:"Syne,sans-serif", fontWeight:700 }}>{icon} SR {Number(val).toFixed(0)}</span>
                                ))}
                              </div>
                              <p style={{ fontSize:14, color:"var(--text-muted)", margin:0, textTransform:"capitalize" }}>
                                {topType ? `Top: ${String(topType).replace(/_/g," ")}` : " "}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payment breakdown + Cash register */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                  <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:16 }}>💳 PAYMENT BREAKDOWN</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {breakdown.map(b => (
                        <div key={b.method}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:14, color:"#C8C5C0", fontWeight:600 }}>{b.icon} {b.method}</span>
                            <span style={{ fontSize:14, fontWeight:800, color:b.color, fontFamily:"Syne,sans-serif" }}>SR {b.amount.toFixed(0)}</span>
                          </div>
                          <div style={{ height:8, borderRadius:4, background:"var(--border)", overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:4, background:b.color, width: totalRevenue>0 ? `${(b.amount/totalRevenue)*100}%` : "0%", transition:"width 0.8s ease" }} />
                          </div>
                          <p style={{ fontSize:14, color:"#444440", marginTop:4 }}>{totalRevenue>0 ? Math.round((b.amount/totalRevenue)*100) : 0}% of total</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:16 }}>🏦 CASH REGISTER</p>
                    <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10, padding:"14px", marginBottom:14 }}>
                      <p style={{ fontSize:14, color:"#22C55E", letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", margin:"0 0 4px" }}>CURRENT CASH BALANCE</p>
                      <p style={{ fontSize:28, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif", margin:0 }}>SR {cashBalance.toFixed(2)}</p>
                    </div>
                    {[
                      { label:"Opening Float", val:openingFloat,  color:"var(--text-muted)" },
                      { label:"Cash Sales (+)", val:cashSalesAmt,  color:"#22C55E" },
                      { label:"Expected Close", val:expectedClose, color:"var(--primary)" },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:14, color:"var(--text-dim)" }}>{r.label}</span>
                        <span style={{ fontSize:14, fontWeight:800, color:r.color, fontFamily:"Syne,sans-serif" }}>SR {r.val.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hourly chart (branch admin only) */}
                {!isSuperAdmin && (() => {
                  const curHour = new Date().getHours();
                  const hrs = Array.from({length:12}, (_,i) => (curHour - 11 + i + 24) % 24);
                  const hData = hrs.map(h => {
                    const rows = recentOrders.filter((o:any) => { const d = o.paidAt ? new Date(o.paidAt) : null; return d && d.getHours() === h; });
                    return { h, count:rows.length, rev:rows.reduce((s:number,o:any)=>s+(o.total??0),0) };
                  });
                  const maxC = Math.max(...hData.map(d=>d.count), 1);
                  const fmtH = (h:number) => h===0?"12a":h<12?`${h}a`:h===12?"12p":`${h-12}p`;
                  return (
                    <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)", marginBottom:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>📈 HOURLY ORDER VOLUME — LAST 12 HRS</p>
                        <span style={{ fontSize:14, color:"var(--text-muted)" }}>{recentOrders.length} total today</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
                        {hData.map(({h,count}) => (
                          <div key={h} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:14, color:count>0?"var(--text-dim)":"transparent", fontFamily:"Syne,sans-serif" }}>{count||""}</span>
                            <div style={{ width:"100%", background: h===curHour ? "var(--primary)" : "rgba(96,165,250,0.45)", borderRadius:"3px 3px 0 0",
                              height:`${Math.max(Math.round((count/maxC)*64),count>0?4:2)}px`, transition:"height 0.5s ease" }} />
                            <span style={{ fontSize:14, color: h===curHour ? "var(--primary)" : "#444440", fontFamily:"Syne,sans-serif", fontWeight: h===curHour?800:400 }}>{fmtH(h)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Order type + Top items */}
                {(() => {
                  const otMap: Record<string,{count:number,revenue:number}> = {};
                  recentOrders.forEach((o:any)=>{ const t=(o.orderType??"other").replace(/_/g," "); if(!otMap[t])otMap[t]={count:0,revenue:0}; otMap[t].count+=1; otMap[t].revenue+=(o.total??0); });
                  const otList = Object.entries(otMap).sort((a,b)=>b[1].revenue-a[1].revenue);
                  const maxOtRev = otList[0]?.[1]?.revenue ?? 1;
                  const OT_COLORS: Record<string,string> = {"dine in":"#60A5FA","takeaway":"#FBBF24","delivery":"#A78BFA","online":"#A78BFA","other":"#34D399"};

                  const itemMap: Record<string,{name:string,qty:number,revenue:number}> = {};
                  recentOrders.forEach((o:any)=>{ (o.items??[]).forEach((it:any)=>{ const n=it.name??it.menuItem?.name??"Unknown"; if(!itemMap[n])itemMap[n]={name:n,qty:0,revenue:0}; const q=it.quantity??it.qty??1; itemMap[n].qty+=q; itemMap[n].revenue+=(it.price??0)*q; }); });
                  const topItems = Object.values(itemMap).sort((a,b)=>b.qty-a.qty).slice(0,6);
                  const maxQty   = topItems[0]?.qty ?? 1;
                  const itemColors = ["var(--primary)","#60A5FA","#22C55E","#F472B6","#FBBF24","#A78BFA"];

                  return (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                      <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                        <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:16 }}>📊 ORDER TYPE BREAKDOWN</p>
                        {otList.length === 0
                          ? <p style={{ fontSize:14, color:"var(--text-muted)", textAlign:"center", padding:"20px 0" }}>No data yet</p>
                          : otList.map(([type,data],i) => {
                            const col = OT_COLORS[type] ?? "#34D399";
                            return (
                              <div key={type} style={{ marginBottom:14 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontSize:14, color:"var(--text)", fontWeight:600, textTransform:"capitalize" }}>{type}</span>
                                    {i===0 && <span style={{ fontSize:14, fontWeight:800, color:col, background:`${col}20`, border:`1px solid ${col}40`, padding:"1px 6px", borderRadius:20, fontFamily:"Syne,sans-serif" }}>HIGHEST</span>}
                                  </div>
                                  <div style={{ textAlign:"right" }}>
                                    <span style={{ fontSize:14, fontWeight:800, color:col, fontFamily:"Syne,sans-serif" }}>SR {data.revenue.toFixed(0)}</span>
                                    <span style={{ fontSize:14, color:"var(--text-dim)", marginLeft:6 }}>{data.count} orders</span>
                                  </div>
                                </div>
                                <div style={{ height:8, borderRadius:4, background:"var(--border)", overflow:"hidden" }}>
                                  <div style={{ height:"100%", borderRadius:4, background:col, width:`${(data.revenue/maxOtRev)*100}%`, transition:"width 0.8s ease" }} />
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                      <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                        <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:16 }}>🏆 TOP SELLING ITEMS</p>
                        {topItems.length === 0
                          ? <p style={{ fontSize:14, color:"var(--text-muted)", textAlign:"center", padding:"20px 0" }}>No data yet</p>
                          : topItems.map((item,i) => {
                            const col = itemColors[i % itemColors.length];
                            return (
                              <div key={item.name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                                <span style={{ fontSize:14, fontWeight:800, color:col, fontFamily:"Syne,sans-serif", width:16, textAlign:"center" }}>#{i+1}</span>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                                    <span style={{ fontSize:14, fontWeight:700, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
                                    <span style={{ fontSize:14, fontWeight:800, color:col, fontFamily:"Syne,sans-serif", marginLeft:8, flexShrink:0 }}>{item.qty}×</span>
                                  </div>
                                  <div style={{ height:5, borderRadius:3, background:"var(--border)", overflow:"hidden" }}>
                                    <div style={{ height:"100%", borderRadius:3, background:col, width:`${(item.qty/maxQty)*100}%`, transition:"width 0.8s ease" }} />
                                  </div>
                                </div>
                                <span style={{ fontSize:14, color:"#22C55E", fontWeight:700, fontFamily:"Syne,sans-serif", flexShrink:0 }}>SR {item.revenue.toFixed(0)}</span>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  );
                })()}

                {/* Recent transactions */}
                <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>🧾 RECENT TRANSACTIONS</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="date" value={txDateFilter} onChange={e => setTxDateFilter(e.target.value)}
                        style={{ background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", minHeight:44, color:"var(--text)", fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit" }} />
                      {txDateFilter && (
                        <button onClick={() => setTxDateFilter("")}
                          style={{ padding:"10px 14px", minHeight:40, borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>×</button>
                      )}
                      <button onClick={handlePrint}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--primary-border)", background:"var(--primary-bg)", color:"var(--primary)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                        🖨 PRINT REPORT
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const filteredTxns = txDateFilter
                      ? recentOrders.filter((o:any) => o.paidAt && new Date(o.paidAt).toISOString().slice(0,10) === txDateFilter)
                      : recentOrders;
                    const txTotal = filteredTxns.reduce((s:number,o:any)=>s+(o.total??0),0);
                    const pmColor: Record<string,string> = { cash:"#22C55E", card:"#60A5FA", online:"#A78BFA" };
                    if (dashLoading) return <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-muted)" }}><p style={{fontSize:14}}>Loading…</p></div>;
                    if (filteredTxns.length === 0) return (
                      <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-muted)" }}>
                        <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
                        <p style={{ fontSize:14, fontWeight:600 }}>{recentOrders.length===0?"No completed orders today":"No orders on selected date"}</p>
                      </div>
                    );
                    return (
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 80px", gap:8, padding:"6px 12px" }}>
                          {["ORDER #","TOTAL","PAYMENT","TYPE","TIME"].map(h=>(
                            <span key={h} style={{ fontSize:14, color:"#444440", fontWeight:700, letterSpacing:"0.1em", fontFamily:"Syne,sans-serif" }}>{h}</span>
                          ))}
                        </div>
                        {filteredTxns.map((o:any, idx:number) => {
                          const time = o.paidAt ? new Date(o.paidAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : "-";
                          return (
                            <div key={`${o._id}-${idx}`} onClick={() => setSelectedTx(selectedTx===o._id?null:o._id)}
                              style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 80px", gap:8, padding:"10px 12px",
                                background: selectedTx===o._id?"var(--primary-bg)":"rgba(255,255,255,0.03)",
                                borderRadius:8, border:`1px solid ${selectedTx===o._id?"var(--primary-border)":"rgba(255,255,255,0.05)"}`,
                                cursor:"pointer", transition:"all 0.15s" }}>
                              <span style={{ fontSize:14, fontWeight:700, color:"var(--primary)", fontFamily:"Syne,sans-serif" }}>#{o.posOrderNumber}</span>
                              <span style={{ fontSize:14, fontWeight:700, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {(o.total??0).toFixed(2)}</span>
                              <span style={{ fontSize:14, fontWeight:700, color:pmColor[o.paymentMethod]??"var(--text-dim)", textTransform:"capitalize" }}>{o.paymentMethod??"-"}</span>
                              <span style={{ fontSize:14, color:"var(--text-muted)", textTransform:"capitalize" }}>{(o.orderType??"").replace(/_/g," ")}</span>
                              <span style={{ fontSize:14, color:"#444440" }}>{time}</span>
                            </div>
                          );
                        })}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 80px", gap:8, padding:"10px 12px", background:"var(--primary-bg)", borderRadius:8, border:"1px solid rgba(212,160,23,0.2)", marginTop:4 }}>
                          <span style={{ fontSize:14, fontWeight:800, color:"var(--primary)", fontFamily:"Syne,sans-serif" }}>TOTAL</span>
                          <span style={{ fontSize:14, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {txTotal.toFixed(2)}</span>
                          <span />
                          <span style={{ fontSize:14, color:"var(--text-dim)" }}>{filteredTxns.length} orders</span>
                          <span />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Procurement */}
                {isAdmin && (
                  <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)", marginTop:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>📦 PROCUREMENT REQUESTS</p>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {(() => { const pending = procRequests.filter((r:any)=>r.status==="pending").length; return pending>0?(<span style={{ fontSize:14, fontWeight:800, color:"#FBBF24", background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", padding:"2px 8px", borderRadius:20, fontFamily:"Syne,sans-serif" }}>{pending} PENDING</span>):null; })()}
                        <button onClick={loadProcRequests} style={{ padding:"6px 12px", minHeight:32, borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>↻ Refresh</button>
                        <a href="/purchase/procurement" style={{ padding:"6px 12px", minHeight:32, borderRadius:7, border:"1px solid var(--primary-border)", background:"var(--primary-bg)", color:"var(--primary)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif", textDecoration:"none", display:"flex", alignItems:"center" }}>VIEW ALL →</a>
                      </div>
                    </div>
                    {procLoading ? (
                      <div style={{ textAlign:"center", padding:"24px 0", color:"var(--text-muted)" }}><p style={{fontSize:14}}>Loading…</p></div>
                    ) : procRequests.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"24px 0", color:"var(--text-muted)" }}>
                        <p style={{ fontSize:28, marginBottom:6 }}>📭</p>
                        <p style={{ fontSize:14, fontWeight:600 }}>No procurement requests yet</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 0.8fr 0.8fr 90px", gap:8, padding:"6px 12px" }}>
                          {["REFERENCE","ITEMS","TOTAL","DATE","STATUS"].map(h=>(
                            <span key={h} style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>{h}</span>
                          ))}
                        </div>
                        {procRequests.slice(0,8).map((req:any) => {
                          const statusCfg: Record<string,{color:string;bg:string}> = { pending:{color:"#FBBF24",bg:"rgba(251,191,36,0.12)"}, received:{color:"#22C55E",bg:"rgba(34,197,94,0.12)"}, cancelled:{color:"#FF6B6B",bg:"rgba(255,107,107,0.12)"} };
                          const cfg = statusCfg[req.status] ?? statusCfg.pending;
                          const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString([],{month:"short",day:"numeric"}) : "—";
                          const itemCount = Array.isArray(req.items) ? req.items.length : 0;
                          return (
                            <div key={req._id} onClick={() => setSelectedProcReq(req)}
                              style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 0.8fr 0.8fr 90px", gap:8, padding:"10px 12px", background:"var(--hover-bg)", borderRadius:8, border:"1px solid var(--border)", marginBottom:4, cursor:"pointer", transition:"border-color 0.15s" }}
                              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor="var(--primary)"}
                              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor="var(--border)"}>
                              <span style={{ fontSize:14, fontWeight:700, color:"var(--primary)", fontFamily:"Syne,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.referenceId ?? req._id?.slice(-8)}</span>
                              <span style={{ fontSize:14, color:"var(--text-muted)" }}>{itemCount} item{itemCount!==1?"s":""}</span>
                              <span style={{ fontSize:14, fontWeight:700, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {(req.totalAmount??0).toFixed(2)}</span>
                              <span style={{ fontSize:14, color:"var(--text-dim)" }}>{date}</span>
                              <span style={{ fontSize:14, fontWeight:800, color:cfg.color, background:cfg.bg, padding:"3px 8px", borderRadius:20, fontFamily:"Syne,sans-serif", textAlign:"center", textTransform:"uppercase" }}>{req.status}</span>
                            </div>
                          );
                        })}
                        {procRequests.length > 8 && (
                          <p style={{ fontSize:14, color:"var(--text-dim)", textAlign:"center", marginTop:8 }}>
                            +{procRequests.length-8} more — <a href="/purchase/procurement" style={{ color:"var(--primary)", textDecoration:"none", fontWeight:700 }}>VIEW ALL</a>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── LIVE ORDERS ── */}
            {dashSubTab === "live" && (() => {
              const STATUS_CFG: Record<string,{label:string,color:string,bg:string,icon:string}> = {
                pending:   {label:"PENDING",   color:"#FBBF24", bg:"rgba(251,191,36,0.1)",  icon:"⏳"},
                preparing: {label:"PREPARING", color:"#60A5FA", bg:"rgba(96,165,250,0.1)",  icon:"👨‍🍳"},
                ready:     {label:"READY",     color:"#22C55E", bg:"rgba(34,197,94,0.1)",   icon:"✅"},
                completed: {label:"COMPLETED", color:"#A78BFA", bg:"rgba(167,139,250,0.1)", icon:"💰"},
              };
              const cols = ["pending","preparing","ready","completed"] as const;
              const grouped = cols.reduce((m,s)=>({...m,[s]:liveOrders.filter((o:any)=>o.status===s)}),{} as Record<string,any[]>);
              return (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 0 3px rgba(34,197,94,0.2)" }} />
                    <span style={{ fontSize:14, color:"var(--text-dim)", fontFamily:"Syne,sans-serif", fontWeight:600 }}>
                      AUTO-REFRESH EVERY 20s · {liveOrders.length} active orders · Last: {liveAt ? liveAt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—"}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                    {cols.map(status => {
                      const cfg    = STATUS_CFG[status];
                      const orders = grouped[status] ?? [];
                      return (
                        <div key={status} style={{ background:"var(--card-bg)", borderRadius:14, padding:"16px", border:`1px solid ${cfg.color}30`, minHeight:200 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                            <span style={{ fontSize:14, fontWeight:800, letterSpacing:"0.1em", color:cfg.color, fontFamily:"Syne,sans-serif" }}>{cfg.icon} {cfg.label}</span>
                            <span style={{ fontSize:14, fontWeight:800, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}40`, borderRadius:20, padding:"2px 8px", fontFamily:"Syne,sans-serif" }}>{orders.length}</span>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {orders.length === 0 && <p style={{ fontSize:14, color:"var(--text-muted)", textAlign:"center", padding:"20px 0" }}>—</p>}
                            {orders.slice(0,8).map((o:any) => {
                              const age = o.createdAt ? Math.floor((Date.now()-new Date(o.createdAt).getTime())/60000) : 0;
                              return (
                                <div key={o._id} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"10px 12px", border:"1px solid var(--border)" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                    <span style={{ fontSize:14, fontWeight:800, color:cfg.color, fontFamily:"Syne,sans-serif" }}>#{o.posOrderNumber}</span>
                                    <span style={{ fontSize:14, color:"var(--text-dim)" }}>{age}m ago</span>
                                  </div>
                                  <p style={{ fontSize:14, color:"var(--text-muted)", margin:"0 0 3px" }}>{o.customerInfo?.name ?? o.customerName ?? "Guest"}</p>
                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                    <span style={{ fontSize:14, color:"var(--text-dim)", textTransform:"capitalize" }}>{o.table?.tableNumber ? `Table ${o.table.tableNumber}` : (o.orderType??"").replace(/_/g," ")}</span>
                                    <span style={{ fontSize:14, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {(o.total??0).toFixed(0)}</span>
                                  </div>
                                  {(o.items??[]).length > 0 && (
                                    <p style={{ fontSize:14, color:"#444440", marginTop:4, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                                      {(o.items as any[]).map((it:any)=>`${it.quantity??1}× ${it.name??it.menuItem?.name}`).join(", ")}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── TABLES ── */}
            {dashSubTab === "tables" && (() => {
              const TABLE_STATUS: Record<string,{color:string,bg:string,border:string,label:string}> = {
                available: {color:"#22C55E", bg:"rgba(34,197,94,0.08)",  border:"rgba(34,197,94,0.25)",  label:"AVAILABLE"},
                occupied:  {color:"#FF6B6B", bg:"rgba(255,107,107,0.08)",border:"rgba(255,107,107,0.25)",label:"OCCUPIED" },
                reserved:  {color:"#FBBF24", bg:"rgba(251,191,36,0.08)", border:"rgba(251,191,36,0.25)", label:"RESERVED" },
                cleaning:  {color:"#60A5FA", bg:"rgba(96,165,250,0.08)", border:"rgba(96,165,250,0.25)", label:"CLEANING" },
              };
              const avail = tableList.filter((t:any)=>t.status==="available").length;
              const occup = tableList.filter((t:any)=>t.status==="occupied").length;
              return (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 0 3px rgba(34,197,94,0.2)" }} />
                      <span style={{ fontSize:14, color:"var(--text-dim)", fontFamily:"Syne,sans-serif", fontWeight:600 }}>AUTO-REFRESH EVERY 15s</span>
                    </div>
                    <span style={{ fontSize:14, color:"#22C55E", fontWeight:700, fontFamily:"Syne,sans-serif" }}>✅ {avail} Available</span>
                    <span style={{ fontSize:14, color:"#FF6B6B", fontWeight:700, fontFamily:"Syne,sans-serif" }}>🔴 {occup} Occupied</span>
                    <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:600 }}>{tableList.length} total tables</span>
                  </div>
                  {tableList.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"48px", color:"var(--text-muted)" }}>
                      <p style={{ fontSize:36, marginBottom:8 }}>🪑</p>
                      <p style={{ fontSize:14 }}>No table data available.</p>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                      {tableList.map((t:any) => {
                        const st   = TABLE_STATUS[t.status] ?? TABLE_STATUS.available;
                        const area = t.area ? ` · ${t.area}` : "";
                        return (
                          <div key={t._id??t.id} style={{ background:st.bg, borderRadius:12, padding:"16px", border:`1px solid ${st.border}`, position:"relative" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                              <p style={{ fontSize:22, fontWeight:800, color:st.color, fontFamily:"Syne,sans-serif", margin:0 }}>T{t.tableNumber}</p>
                              <span style={{ fontSize:11, fontWeight:800, color:st.color, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", padding:"2px 6px", borderRadius:20, background:`${st.color}20`, border:`1px solid ${st.color}40` }}>{st.label}</span>
                            </div>
                            {t.capacity && <p style={{ fontSize:14, color:st.color, opacity:0.7, margin:"0 0 4px" }}>👥 {t.capacity} seats</p>}
                            {area && <p style={{ fontSize:14, color:st.color, opacity:0.6, margin:0 }}>📍{area}</p>}
                            {t.status==="occupied" && t.currentOrder && (
                              <p style={{ fontSize:14, color:"#FF6B6B", fontWeight:700, marginTop:6 }}>#{t.currentOrder.posOrderNumber}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ══════════════════════════════════════════
            REPORT TAB
        ══════════════════════════════════════════ */}
        {(tab === "report" || (!isAdmin && tab !== "users")) && (
          <>
            {/* Admin: shift selector + report type toggle */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              {!isCook && (
                <div style={{ display:"flex", gap:8 }}>
                  {(["cashier","cook"] as const).map((rt) => (
                    <button key={rt} onClick={() => setReportType(rt)}
                      style={{ padding:"11px 18px", minHeight:44, borderRadius:10, border:`1.5px solid ${reportType===rt?"var(--primary)":"var(--border)"}`, background:reportType===rt?"var(--primary-bg)":"var(--input-bg)", color:reportType===rt?"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                      {rt === "cashier" ? "💰 CASHIER SHIFT END" : "👨‍🍳 COOK SHIFT END"}
                    </button>
                  ))}
                </div>
              )}
              {isAdmin && reportShifts.length > 0 && (
                <select value={selectedShiftId}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedShiftId(id);
                    loadCashierReport(id, reportDateFrom, reportDateTo);
                    loadCookReport(id);
                  }}
                  style={{ flex:1, minWidth:220, background:"var(--input-bg)", border:`1px solid var(--primary-border)`, borderRadius:10, padding:"10px 14px", minHeight:44, color:"var(--primary)", fontSize:14, fontWeight:700, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
                  {reportShifts.map((s: any) => {
                    const c      = s.cashier ?? s.openedBy ?? s.user ?? s.staff ?? {};
                    const name   = c.fullName ?? c.name ?? c.fullname ?? c.displayName ??
                                   s.userName ?? s.cashierName ?? s.employeeName ?? s.staffName ?? "—";
                    const cid    = c.cashierId ?? c.cashier_id ?? c.employeeId ?? s.cashierId ?? s.userId ?? "";
                    const date   = s.openedAt ? new Date(s.openedAt).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
                    const status = s.status === "open" ? " 🟢" : " ⬛";
                    return <option key={s._id} value={s._id}>{name}{cid ? ` (${cid})` : ""} — {date}{status}</option>;
                  })}
                </select>
              )}
              {isAdmin && reportShifts.length === 0 && !reportLoading && (
                <span style={{ fontSize:14, color:"var(--text-dim)", fontStyle:"italic" }}>No shifts found</span>
              )}
              <button onClick={initReport}
                style={{ padding:"10px 14px", minHeight:44, borderRadius:10, border:"1px solid var(--border)", background:"var(--input-bg)", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                ↻ Refresh
              </button>
            </div>

            {reportLoading && !cashierReport && (
              <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>
                <p style={{ fontSize:14 }}>Loading report…</p>
              </div>
            )}
            {!reportLoading && !cashierReport && !selectedShiftId && (
              <div style={{ textAlign:"center", padding:"48px", color:"var(--text-muted)" }}>
                <p style={{ fontSize:36, marginBottom:8 }}>📋</p>
                <p style={{ fontSize:14 }}>No shift data found. {isAdmin ? "No shifts have been recorded yet." : "Your shift report will appear here once your shift is active."}</p>
              </div>
            )}

            {(cashierReport || (selectedShiftId && !reportLoading)) && (<>
            <div style={{ background:"var(--primary-bg)", border:"1px solid rgba(212,160,23,0.2)", borderRadius:12, padding:"12px 18px", display:"flex", gap:24, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              {[
                { label:"SHIFT STARTED", val:reportStartStr },
                { label:"DURATION",      val:reportDuration },
                { label:"CASHIER",       val:reportCashier  },
                { label:"ROLE",          val:ROLE_CFG[reportRole]?.label ?? reportRole },
              ].map((r,i) => (
                <div key={r.label} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {i > 0 && <div style={{ width:1, height:28, background:"var(--border)" }} />}
                  <div>
                    <p style={{ fontSize:14, color:"var(--text-muted)", letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", margin:0 }}>{r.label}</p>
                    <p style={{ fontSize:14, fontWeight:700, color:"var(--text)", margin:0 }}>{r.val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Date filter */}
            <div style={{ background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:14, fontWeight:700, color:"var(--text-muted)", fontFamily:"Syne,sans-serif", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>📅 DATE RANGE:</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif" }}>From</span>
                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)}
                  style={{ background:"var(--input-bg)", border:`1px solid ${reportDateFrom?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"10px 12px", minHeight:44, color:"var(--text)", fontSize:14, outline:"none", fontFamily:"inherit", cursor:"pointer", colorScheme:"dark" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif" }}>To</span>
                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)}
                  style={{ background:"var(--input-bg)", border:`1px solid ${reportDateTo?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"10px 12px", minHeight:44, color:"var(--text)", fontSize:14, outline:"none", fontFamily:"inherit", cursor:"pointer", colorScheme:"dark" }} />
              </div>
              <button onClick={() => { setReportDateFrom(""); setReportDateTo(""); }}
                disabled={!reportDateFrom && !reportDateTo}
                style={{ padding:"10px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:(reportDateFrom||reportDateTo)?"var(--primary)":"transparent", color:(reportDateFrom||reportDateTo)?"#fff":"var(--text-dim)", fontSize:14, fontWeight:700, cursor:(reportDateFrom||reportDateTo)?"pointer":"default", fontFamily:"Syne,sans-serif", opacity:(reportDateFrom||reportDateTo)?1:0.4, transition:"all 0.15s", whiteSpace:"nowrap" }}>
                Clear ×
              </button>
            </div>

            {effectiveReportType === "cashier" ? (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                  <StatBox label="OPENING CASH"   value={reportLoading ? "…" : `SR ${crOpening.toFixed(0)}`} color="var(--text-muted)" icon="🏦" />
                  <StatBox label="TOTAL SALES"    value={reportLoading ? "…" : `SR ${crTotal.toFixed(0)}`}   sub={`${crStats?.completedOrders ?? session.transactions} transactions`} color="#22C55E" icon="💰" />
                  <StatBox label="EXPECTED CLOSE" value={reportLoading ? "…" : `SR ${crExpect.toFixed(0)}`} sub="Opening + Sales" color="var(--primary)" icon="💵" />
                  <StatBox label="AVG ORDER"      value={reportLoading ? "…" : `SR ${crAvg.toFixed(0)}`}    sub="Per transaction" color="#60A5FA" icon="📊" />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                  <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:14 }}>PAYMENT BREAKDOWN</p>
                    {crBreakdown.map((b) => (
                      <div key={b.method} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:14, color:"#C8C5C0", fontWeight:600 }}>{b.icon} {b.method}</span>
                          <span style={{ fontSize:14, fontWeight:800, color:b.color, fontFamily:"Syne,sans-serif" }}>SR {b.amount.toFixed(2)}</span>
                        </div>
                        <div style={{ height:6, borderRadius:3, background:"var(--border)", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:3, background:b.color, width: crTotal>0 ? `${(b.amount/crTotal)*100}%` : "0%" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>CASHIER SHIFT SUMMARY</p>
                      <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:7, border:"1px solid var(--primary-border)", background:"rgba(212,160,23,0.07)", color:"var(--primary)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>🖨 PRINT</button>
                    </div>
                    {[
                      { label:"Opening Float",   val:`SR ${crOpening.toFixed(2)}`,    color:"var(--text-muted)" },
                      { label:"Cash Sales",       val:`SR ${crCashSales.toFixed(2)}`,  color:"#22C55E"           },
                      { label:"Card Sales",       val:`SR ${crCardSales.toFixed(2)}`,  color:"#60A5FA"           },
                      { label:"Online Sales",     val:`SR ${crOnlineSales.toFixed(2)}`,color:"#A78BFA"           },
                      { label:"Gross Revenue",    val:`SR ${crTotal.toFixed(2)}`,      color:"var(--primary)"    },
                      { label:"Avg Order Value",  val:`SR ${crAvg.toFixed(2)}`,        color:"var(--text)"       },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:14, color:"#666660" }}>{r.label}</span>
                        <span style={{ fontSize:14, fontWeight:800, color:r.color, fontFamily:"Syne,sans-serif" }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"20px", border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>💵 BILLING TRANSACTIONS</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => setShowCashModal(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:8, border:"1px solid rgba(34,197,94,0.3)", background:"rgba(34,197,94,0.08)", color:"#22C55E", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>＋ ENTER CASH</button>
                      <button onClick={handlePrint}                   style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:8, border:"1px solid var(--primary-border)", background:"rgba(212,160,23,0.07)", color:"var(--primary)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>🖨 PRINT & SAVE</button>
                    </div>
                  </div>
                  {billingTxns.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-muted)" }}>
                      <p style={{ fontSize:32, margin:"0 0 8px" }}>🧾</p>
                      <p style={{ fontSize:14 }}>No billing transactions yet.</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 60px", gap:8, padding:"6px 12px", marginBottom:4 }}>
                        {["ORDER #","BILL AMT","CASH PAID","CHANGE","TIME","ITEMS"].map(h=>(
                          <span key={h} style={{ fontSize:14, color:"#444440", fontWeight:700, letterSpacing:"0.1em", fontFamily:"Syne,sans-serif" }}>{h}</span>
                        ))}
                      </div>
                      {billingTxns.map(tx => (
                        <div key={tx.id} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 60px", gap:8, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)", marginBottom:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:"var(--primary)", fontFamily:"Syne,sans-serif" }}>{tx.id}</span>
                          <span style={{ fontSize:14, fontWeight:700, color:"#22C55E" }}>SR {tx.amount.toFixed(2)}</span>
                          <span style={{ fontSize:14, color:"var(--text-muted)" }}>SR {tx.cash.toFixed(2)}</span>
                          <span style={{ fontSize:14, color: tx.change>0?"#60A5FA":"var(--text-dim)" }}>SR {tx.change.toFixed(2)}</span>
                          <span style={{ fontSize:14, color:"#444440" }}>{tx.time}</span>
                          <span style={{ fontSize:14, color:"var(--text-dim)" }}>{tx.items} items</span>
                        </div>
                      ))}
                      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 60px", gap:8, padding:"10px 12px", background:"var(--primary-bg)", borderRadius:8, border:"1px solid rgba(212,160,23,0.2)", marginTop:8 }}>
                        <span style={{ fontSize:14, fontWeight:800, color:"var(--primary)", fontFamily:"Syne,sans-serif" }}>TOTAL</span>
                        <span style={{ fontSize:14, fontWeight:800, color:"#22C55E",        fontFamily:"Syne,sans-serif" }}>SR {billingTotal.toFixed(2)}</span>
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--text-muted)", fontFamily:"Syne,sans-serif" }}>SR {billingCashTotal.toFixed(2)}</span>
                        <span style={{ fontSize:14, fontWeight:700, color:"#60A5FA",        fontFamily:"Syne,sans-serif" }}>SR {billingChangeTotal.toFixed(2)}</span>
                        <span style={{ fontSize:14, color:"#444440" }}>{billingTxns.length} txns</span>
                        <span style={{ fontSize:14, color:"var(--text-dim)" }}>{billingTxns.reduce((s,t)=>s+t.items,0)} items</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Cook report */
              <div style={{ background:"var(--card-bg)", borderRadius:14, padding:"24px", border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", margin:0 }}>👨‍🍳 Cook Shift End Report</p>
                    <p style={{ fontSize:14, color:"var(--text-dim)", margin:"4px 0 0" }}>Kitchen performance summary</p>
                  </div>
                  <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:8, border:"1px solid var(--primary-border)", background:"var(--primary-bg)", color:"var(--primary)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>🖨 PRINT REPORT</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                  <StatBox label="ORDERS COMPLETED" value={reportLoading ? "…" : (cookReport?.ordersCompleted ?? cookReport?.completedOrders ?? cookReport?.orders ?? 0)} sub="This shift"        color="#22C55E" icon="✅" />
                  <StatBox label="AVG PREP TIME"     value={reportLoading ? "…" : `${cookReport?.avgPrepMin ?? cookReport?.avgPrepTime ?? cookReport?.averagePrepTime ?? 0} min`} sub="Per order" color="#FBBF24" icon="⏱" />
                  <StatBox label="RUSH ORDERS"       value={reportLoading ? "…" : (cookReport?.rushOrders ?? cookReport?.rush ?? 0)}         sub="Priority handled" color="#FF6B6B" icon="🔥" />
                </div>
                {((cookReport?.stations ?? cookReport?.station ?? []) as { name:string; items:number; avgPrepMin:number|null }[])
                  .map(s => ({ station:s.name, items:s.items, time: s.avgPrepMin != null ? `${s.avgPrepMin} min avg` : "—" }))
                  .map(s => (
                    <div key={s.station} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", marginBottom:8 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:"var(--text)" }}>{s.station}</span>
                      <div style={{ display:"flex", gap:24 }}>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:14, color:"var(--text-dim)", fontFamily:"Syne,sans-serif", margin:0 }}>ITEMS</p>
                          <p style={{ fontSize:14, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif", margin:0 }}>{s.items}</p>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:14, color:"var(--text-dim)", fontFamily:"Syne,sans-serif", margin:0 }}>AVG TIME</p>
                          <p style={{ fontSize:14, fontWeight:700, color:"#FBBF24", fontFamily:"Syne,sans-serif", margin:0 }}>{s.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                }
                <div style={{ marginTop:16, padding:"14px", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10 }}>
                  <p style={{ fontSize:14, color:"#22C55E", fontWeight:700, fontFamily:"Syne,sans-serif", margin:"0 0 4px" }}>SHIFT NOTES</p>
                  <p style={{ fontSize:14, color:"var(--text-dim)", margin:0 }}>{cookReport?.notes || "No shift notes recorded."}</p>
                </div>
              </div>
            )}
            </>)}
          </>
        )}

        {/* ══════════════════════════════════════════
            SHIFTS TAB
        ══════════════════════════════════════════ */}
        {tab === "shifts" && isAdmin && (
          <>
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:14, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", margin:"0 0 4px" }}>🕐 Shift History & Management</p>
              <p style={{ fontSize:14, color:"var(--text-dim)", margin:0 }}>Track all employee shifts — active and completed</p>
            </div>

            {/* Active shift banner */}
            <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 0 3px rgba(34,197,94,0.3)", animation:"pulse 2s infinite" }} />
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif", margin:0 }}>ACTIVE SHIFT — {session.user.name}</p>
                  <p style={{ fontSize:14, color:"var(--text-dim)", margin:"2px 0 0" }}>Started: {start.toLocaleTimeString()} · {duration} elapsed · SR {session.sales.toFixed(2)} in sales</p>
                </div>
              </div>
            </div>

            {/* Shift date filter */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap", background:"var(--card-bg)", borderRadius:12, padding:"12px 16px", border:"1px solid var(--border)" }}>
              <span style={{ fontSize:14, fontWeight:700, color:"var(--text-muted)", fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>📅 FILTER BY DATE:</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif" }}>From</span>
                <input type="date" value={shiftDateFrom}
                  onChange={e => { setShiftDateFrom(e.target.value); loadShifts(1, e.target.value, shiftDateTo); setShiftsPage(1); }}
                  style={{ background:"var(--input-bg)", border:`1px solid ${shiftDateFrom?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"10px 12px", minHeight:44, color:"var(--text)", fontSize:14, outline:"none", cursor:"pointer", colorScheme:"dark" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif" }}>To</span>
                <input type="date" value={shiftDateTo}
                  onChange={e => { setShiftDateTo(e.target.value); loadShifts(1, shiftDateFrom, e.target.value); setShiftsPage(1); }}
                  style={{ background:"var(--input-bg)", border:`1px solid ${shiftDateTo?"var(--primary)":"var(--border)"}`, borderRadius:8, padding:"10px 12px", minHeight:44, color:"var(--text)", fontSize:14, outline:"none", cursor:"pointer", colorScheme:"dark" }} />
              </div>
              <button onClick={() => { setShiftDateFrom(""); setShiftDateTo(""); setShiftsPage(1); loadShifts(1,"",""); }}
                disabled={!shiftDateFrom && !shiftDateTo}
                style={{ padding:"10px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:(shiftDateFrom||shiftDateTo)?"var(--primary)":"transparent", color:(shiftDateFrom||shiftDateTo)?"#fff":"var(--text-dim)", fontSize:14, fontWeight:700, cursor:(shiftDateFrom||shiftDateTo)?"pointer":"default", fontFamily:"Syne,sans-serif", opacity:(shiftDateFrom||shiftDateTo)?1:0.4, transition:"all 0.15s", whiteSpace:"nowrap" }}>
                Clear ×
              </button>
            </div>

            {shiftsLoading ? (
              <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>
                <p style={{ fontSize:14 }}>Loading shifts…</p>
              </div>
            ) : apiShifts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>
                <p style={{ fontSize:36, margin:"0 0 8px" }}>📋</p>
                <p style={{ fontSize:14 }}>No shifts recorded yet.</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 80px 110px", gap:8, padding:"6px 14px" }}>
                  {["EMPLOYEE","ROLE","OPENED","CLOSED","REVENUE","STATUS","ACTION"].map(h=>(
                    <span key={h} style={{ fontSize:14, color:"#444440", fontWeight:700, letterSpacing:"0.1em", fontFamily:"Syne,sans-serif" }}>{h}</span>
                  ))}
                </div>
                {apiShifts.map((s:any) => {
                  const cashier    = s.cashier ?? s.openedBy ?? s.user ?? s.staff ?? {};
                  const empName    = cashier.fullName ?? cashier.name ?? cashier.fullname ?? cashier.displayName ??
                                     s.userName ?? s.cashierName ?? s.employeeName ?? s.staffName ?? "—";
                  const empId      = cashier.cashierId ?? cashier.cashier_id ?? cashier.employeeId ?? cashier.id ??
                                     s.cashierId ?? s.userId ?? "";
                  const role       = cashier.role ?? s.role ?? s.userRole ?? "cashier";
                  const rcfg       = ROLE_CFG[role] ?? ROLE_CFG.cashier;
                  const isOpen     = s.status === "open";
                  const revenue    = s.summary?.totalRevenue ?? s.summary?.revenue ?? s.summary?.totalSales ??
                                     s.totalRevenue ?? s.revenue ?? s.sales ?? s.totalSales ?? s.closingAmount ?? 0;
                  const openedDate = s.openedAt ? new Date(s.openedAt) : null;
                  return (
                    <div key={s._id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 80px 110px", gap:8, padding:"12px 14px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:`1px solid ${isOpen?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.05)"}` }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:"var(--text)", margin:0 }}>{empName}</p>
                        <p style={{ fontSize:14, color:"var(--text-dim)", margin:0 }}>{empId}</p>
                      </div>
                      <span style={{ fontSize:14, padding:"3px 8px", borderRadius:6, background:rcfg.bg, color:rcfg.color, fontWeight:700, fontFamily:"Syne,sans-serif", alignSelf:"start" }}>{role.toUpperCase()}</span>
                      <div>
                        <p style={{ fontSize:14, color:"var(--text-muted)", margin:0 }}>{openedDate ? openedDate.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : "—"}</p>
                        <p style={{ fontSize:14, color:"#444440", margin:0 }}>{openedDate ? openedDate.toLocaleDateString() : ""}</p>
                      </div>
                      <span style={{ fontSize:14, color:"var(--text-muted)" }}>{s.closedAt ? new Date(s.closedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : "—"}</span>
                      <span style={{ fontSize:14, fontWeight:800, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {revenue.toFixed(2)}</span>
                      <span style={{ fontSize:14, padding:"3px 8px", borderRadius:6, background: isOpen?"rgba(34,197,94,0.12)":"rgba(255,255,255,0.05)", color: isOpen?"#22C55E":"var(--text-dim)", fontWeight:700, fontFamily:"Syne,sans-serif", alignSelf:"start" }}>
                        {(s.status ?? "").toUpperCase()}
                      </span>
                      {/* END SHIFT action */}
                      {isOpen ? (
                        <button
                          onClick={async () => {
                            if (!confirm(`End shift for ${empName}?`)) return;
                            try {
                              await api.patch(`/shifts/${s._id}`, { status:"closed", closedAt: new Date().toISOString() });
                              loadShifts();
                            } catch (err) {
                              console.error("END SHIFT ERROR:", err);
                              alert("Failed to end shift. Check console for details.");
                            }
                          }}
                          style={{ padding:"5px 10px", borderRadius:7, border:"1px solid rgba(255,68,68,0.35)", background:"rgba(255,68,68,0.08)", color:"#FF4444", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif", letterSpacing:"0.04em", whiteSpace:"nowrap", alignSelf:"start" }}>
                          ⏹ END SHIFT
                        </button>
                      ) : (
                        <span style={{ fontSize:12, color:"var(--text-dim)" }}>—</span>
                      )}
                    </div>
                  );
                })}

                {shiftsTotalPg > 1 && (
                  <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, paddingTop:12 }}>
                    <button disabled={shiftsPage===1} onClick={() => { const p=shiftsPage-1; setShiftsPage(p); loadShifts(p); }}
                      style={{ padding:"11px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color: shiftsPage===1?"var(--text-dim)":"var(--text)", fontSize:14, fontWeight:700, cursor: shiftsPage===1?"not-allowed":"pointer", fontFamily:"Syne,sans-serif" }}>← Prev</button>
                    <span style={{ fontSize:14, color:"var(--text-muted)", fontFamily:"Syne,sans-serif" }}>Page {shiftsPage} / {shiftsTotalPg}</span>
                    <button disabled={shiftsPage===shiftsTotalPg} onClick={() => { const p=shiftsPage+1; setShiftsPage(p); loadShifts(p); }}
                      style={{ padding:"11px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color: shiftsPage===shiftsTotalPg?"var(--text-dim)":"var(--text)", fontSize:14, fontWeight:700, cursor: shiftsPage===shiftsTotalPg?"not-allowed":"pointer", fontFamily:"Syne,sans-serif" }}>Next →</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════
            USERS TAB
        ══════════════════════════════════════════ */}
        {tab === "users" && isAdmin && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <p style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>
                  {users.length} USERS REGISTERED — showing {Math.min(USERS_PER_PAGE, users.filter(u => u.role!=="waiter" && (!userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())) && (branchFilter==="all" || u.branch===branchFilter)).length)} of {users.filter(u => u.role!=="waiter" && (!userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())) && (branchFilter==="all" || u.branch===branchFilter)).length}
                </p>
              </div>
              <button onClick={() => setShowAdd(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", fontSize:15, fontWeight:800, fontFamily:"Syne,sans-serif", letterSpacing:"0.05em", background:"linear-gradient(135deg,var(--primary),#8B6010)", color:"var(--bg)", boxShadow:"0 4px 14px var(--primary-border)" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                ADD USER
              </button>
            </div>

            {/* Search + branch filter */}
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200, position:"relative" }}>
                <input placeholder="Search users by name or email…" value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                  style={{ width:"100%", padding:"10px 14px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button onClick={() => setBranchFilter("all")}
                  style={{ padding:"11px 16px", minHeight:44, borderRadius:10, border:`1px solid ${branchFilter==="all"?"var(--primary)":"var(--border)"}`, background:branchFilter==="all"?"var(--primary-bg)":"var(--input-bg)", color:branchFilter==="all"?"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                  ALL BRANCHES
                </button>
                {branches.map(br => (
                  <button key={br.id} onClick={() => { setBranchFilter(br.name); setUsersPage(1); }}
                    style={{ padding:"11px 16px", minHeight:44, borderRadius:10, border:`1px solid ${branchFilter===br.name?"var(--primary)":"var(--border)"}`, background:branchFilter===br.name?"var(--primary-bg)":"var(--input-bg)", color:branchFilter===br.name?"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>
                    🏪 {br.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Waiter section */}
            {(() => {
              const filteredWaiters = users.filter(u => u.role==="waiter" && (branchFilter==="all" || u.branch===branchFilter) && (!userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase())));
              if (filteredWaiters.length === 0) return null;
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ height:1, flex:1, background:"rgba(244,114,182,0.2)" }} />
                    <span style={{ fontSize:14, fontWeight:800, color:"#F472B6", letterSpacing:"0.12em", fontFamily:"Syne,sans-serif" }}>🧑‍🍽 WAITERS</span>
                    <div style={{ height:1, flex:1, background:"rgba(244,114,182,0.2)" }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
                    {filteredWaiters.map(user => {
                      const rcfg  = ROLE_CFG.waiter;
                      const isSelf = user.id === session.user.id;
                      return (
                        <div key={user.id} style={{ background:"var(--card-bg)", borderRadius:14, padding:"18px", border:"1px solid rgba(244,114,182,0.2)", position:"relative", overflow:"hidden", opacity:user.isActive?1:0.7, transition:"all 0.2s" }}>
                          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#F472B6,transparent)" }} />
                          {!user.isActive && <div style={{ position:"absolute", top:10, right:10, fontSize:14, fontWeight:800, color:"#FF4444", background:"rgba(255,68,68,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(255,68,68,0.25)" }}>INACTIVE</div>}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                            <div style={{ width:42, height:42, borderRadius:"50%", background:rcfg.bg, border:`1px solid ${rcfg.color}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={rcfg.color} strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={rcfg.color} strokeWidth="2" strokeLinecap="round"/></svg>
                            </div>
                            <span style={{ fontSize:14, fontWeight:800, color:rcfg.color, letterSpacing:"0.06em", padding:"3px 8px", borderRadius:20, background:rcfg.bg, border:`1px solid ${rcfg.color}30` }}>WAITER</span>
                          </div>
                          <p style={{ fontSize:15, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:2 }}>{user.name}</p>
                          <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:2 }}>🏪 {user.branch || ""}</p>
                          <p style={{ fontSize:14, color:"#444440", marginBottom:8 }}>ID: {user.cashierId}</p>
                          {(user.permissions?.length > 0) && (
                            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
                              {user.permissions.map((p: string) => (
                                <span key={p} style={{ fontSize:11, fontWeight:800, color:"#22C55E", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:6, padding:"2px 7px", letterSpacing:"0.06em", fontFamily:"Syne,sans-serif" }}>
                                  🔑 {p.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                          {!isSelf && (
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => { setEditUserId(user.id); setEditForm({ fullname:user.name||"", email:user.email, pin:user.pin, role:user.role, cashierId:user.cashierId, isActive:user.isActive, permissions:user.permissions||[], branch:user.branch||"" }); }}
                                style={{ padding:"10px 13px", minHeight:40, borderRadius:8, border:"1px solid rgba(244,114,182,0.25)", background:"rgba(244,114,182,0.06)", color:"#F472B6", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>✏️ EDIT</button>
                              <button onClick={() => updateUserData(user.id, { isActive:!user.isActive })}
                                style={{ flex:1, padding:"10px 8px", minHeight:40, borderRadius:8, border:`1px solid ${user.isActive?"rgba(255,165,0,0.25)":"rgba(34,197,94,0.25)"}`, background:user.isActive?"rgba(255,165,0,0.06)":"rgba(34,197,94,0.06)", color:user.isActive?"#FFA500":"#22C55E", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                                {user.isActive ? "⏸ DEACTIVATE" : "▶ ACTIVATE"}
                              </button>
                              <button onClick={() => setConfirmDel(user.id)}
                                style={{ padding:"10px 13px", minHeight:40, borderRadius:8, border:"1px solid rgba(255,68,68,0.2)", background:"rgba(255,68,68,0.06)", color:"#FF6B6B", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>🗑</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize:14, fontWeight:800, color:"var(--text-dim)", letterSpacing:"0.12em", fontFamily:"Syne,sans-serif" }}>OTHER STAFF</span>
                    <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }} />
                  </div>
                </>
              );
            })()}

            {/* Non-waiter users grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
              {users
                .filter(u => u.role !== "waiter")
                .filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                .filter(u => branchFilter === "all" || u.branch === branchFilter)
                .slice((usersPage-1)*USERS_PER_PAGE, usersPage*USERS_PER_PAGE)
                .map(user => {
                  const rcfg  = ROLE_CFG[user.role] || ROLE_CFG.cashier;
                  const isSelf = user.id === session.user.id;
                  return (
                    <div key={user.id} style={{ background:"var(--card-bg)", borderRadius:14, padding:"18px", border:`1px solid ${isSelf?"var(--primary-border)":user.isActive?"var(--border)":"rgba(255,68,68,0.15)"}`, position:"relative", overflow:"hidden", opacity:user.isActive?1:0.7, transition:"all 0.2s" }}>
                      {isSelf && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,var(--primary),transparent)" }} />}
                      {!user.isActive && <div style={{ position:"absolute", top:10, right:10, fontSize:14, fontWeight:800, color:"#FF4444", background:"rgba(255,68,68,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(255,68,68,0.25)" }}>INACTIVE</div>}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div style={{ width:42, height:42, borderRadius:"50%", background:rcfg.bg, border:`1px solid ${rcfg.color}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={rcfg.color} strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={rcfg.color} strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                        <span style={{ fontSize:14, fontWeight:800, color:rcfg.color, letterSpacing:"0.06em", padding:"3px 8px", borderRadius:20, background:rcfg.bg, border:`1px solid ${rcfg.color}30` }}>{rcfg.label.toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize:15, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:2 }}>{user.name}</p>
                      <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:2 }}>📧 {user.email}</p>
                      <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:2 }}>🏪 {user.branch || ""}</p>
                      <p style={{ fontSize:14, color:"#444440", marginBottom:2 }}>ID: {user.cashierId}</p>
                      <p style={{ fontSize:14, color:"var(--text-muted)", marginBottom:12 }}>Added: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</p>
                      <div style={{ display:"flex", gap:5, marginBottom:8 }}>
                        {(user.pin||"").split("").map((_:any, pi:Key|null|undefined) => (
                          <div key={pi} style={{ width:8, height:8, borderRadius:"50%", background:"rgba(212,160,23,0.4)" }} />
                        ))}
                      </div>
                      {/* Permission badges */}
                      {(user.permissions?.length > 0) && (
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
                          {user.permissions.map((p: string) => (
                            <span key={p} style={{ fontSize:11, fontWeight:800, color:"#22C55E", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:6, padding:"2px 7px", letterSpacing:"0.06em", fontFamily:"Syne,sans-serif" }}>
                              🔑 {p.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                      {!isSelf && (
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => { setEditUserId(user.id); setEditForm({ fullname:user.name||"", email:user.email, pin:user.pin, role:user.role, cashierId:user.cashierId, isActive:user.isActive, permissions:user.permissions||[], branch:user.branch||"" }); }}
                            style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(96,165,250,0.25)", background:"rgba(96,165,250,0.06)", color:"#60A5FA", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>✏️ EDIT</button>
                          <button onClick={() => updateUserData(user.id, { isActive:!user.isActive })}
                            style={{ flex:1, padding:"7px", borderRadius:8, border:`1px solid ${user.isActive?"rgba(255,165,0,0.25)":"rgba(34,197,94,0.25)"}`, background:user.isActive?"rgba(255,165,0,0.06)":"rgba(34,197,94,0.06)", color:user.isActive?"#FFA500":"#22C55E", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                            {user.isActive ? "⏸ DEACTIVATE" : "▶ ACTIVATE"}
                          </button>
                          <button onClick={() => setConfirmDel(user.id)}
                            style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,68,68,0.2)", background:"rgba(255,68,68,0.06)", color:"#FF6B6B", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>🗑</button>
                        </div>
                      )}
                      {isSelf && <p style={{ fontSize:14, color:"var(--primary)", fontWeight:700, textAlign:"center" }}>● CURRENT SESSION</p>}
                    </div>
                  );
                })
              }
            </div>

            {/* Users pagination */}
            {(() => {
              const filtered    = users.filter(u => u.role!=="waiter").filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).filter(u => branchFilter==="all" || u.branch===branchFilter);
              const totalPages  = Math.ceil(filtered.length / USERS_PER_PAGE);
              if (totalPages <= 1) return null;
              return (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, paddingTop:16 }}>
                  <button disabled={usersPage===1} onClick={() => setUsersPage(p=>p-1)}
                    style={{ padding:"11px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color:usersPage===1?"var(--text-dim)":"var(--text)", fontSize:14, fontWeight:700, cursor:usersPage===1?"not-allowed":"pointer", fontFamily:"Syne,sans-serif" }}>← Prev</button>
                  <span style={{ fontSize:14, color:"var(--text-muted)", fontFamily:"Syne,sans-serif" }}>Page {usersPage} / {totalPages}</span>
                  <button disabled={usersPage===totalPages} onClick={() => setUsersPage(p=>p+1)}
                    style={{ padding:"11px 16px", minHeight:44, borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color:usersPage===totalPages?"var(--text-dim)":"var(--text)", fontSize:14, fontWeight:700, cursor:usersPage===totalPages?"not-allowed":"pointer", fontFamily:"Syne,sans-serif" }}>Next →</button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          EDIT USER MODAL
      ══════════════════════════════════════════ */}
      {editUserId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setEditUserId(null)}>
          <div style={{ background:"var(--modal-bg)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:20, padding:"28px", width:460, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:4 }}>✏️ Edit Employee</h3>
            <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:20 }}>Update account details for {users.find(u=>u.id===editUserId)?.name}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {([
                { label:"Full Name",                         key:"fullname",  type:"text"     },
                { label:"Cashier ID",                        key:"cashierId", type:"text"     },
                { label:"Email Address",                     key:"email",     type:"email"    },
                { label:"New Password (leave blank to keep)",key:"password",  type:"password" },
                { label:"PIN (4+ digits)",                   key:"pin",       type:"password" },
              ] as { label:string; key:string; type:string }[]).map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:5 }}>{f.label.toUpperCase()}</label>
                  <input type={f.type} value={String((editForm as Record<string,unknown>)[f.key] ?? "")} onChange={e => setEditForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{ width:"100%", background:"var(--input-bg)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 12px", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"Syne,sans-serif", boxSizing:"border-box" }} />
                </div>
              ))}
            </div>
            {/* Role */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>ROLE</label>
              <div style={{ display:"flex", gap:10 }}>
                {(["cashier","cook","admin","waiter"] as (UserRole|"waiter")[]).map(r => (
                  <button key={r} onClick={() => setEditForm(p=>({...p,role:r}))}
                    style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${editForm.role===r?(ROLE_CFG[r]?.color??"var(--primary)")+"60":"var(--border)"}`, background:editForm.role===r?ROLE_CFG[r]?.bg??"var(--primary-bg)":"rgba(255,255,255,0.03)", color:editForm.role===r?ROLE_CFG[r]?.color??"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                    {r==="admin"?"🛡 ADMIN":r==="cook"?"👨‍🍳 COOK":r==="waiter"?"🧑‍🍽 WAITER":"👤 CASHIER"}
                  </button>
                ))}
              </div>
            </div>
            {/* Branch */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>BRANCH</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {branches.map(br => (
                  <button key={br.id} onClick={() => setEditForm(p=>({...p,branch:br.name}))}
                    style={{ padding:"11px 16px", minHeight:44, borderRadius:9, border:`1px solid ${editForm.branch===br.name?"var(--primary)":"var(--border)"}`, background:editForm.branch===br.name?"var(--primary-bg)":"rgba(255,255,255,0.03)", color:editForm.branch===br.name?"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>
                    🏪 {br.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Access control */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>ACCESS CONTROL</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {ACCESS_MODULES.map(module => {
                  const checked = (editForm.permissions??[]).includes(module);
                  return (
                    <div key={module} onClick={() => setEditForm(p=>({ ...p, permissions: checked?(p.permissions??[]).filter(x=>x!==module):[...(p.permissions??[]),module] }))}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:10, background:checked?"rgba(255,68,68,0.08)":"rgba(255,255,255,0.03)", border:checked?"1px solid rgba(255,68,68,0.25)":"1px solid var(--border)", cursor:"pointer", transition:"all 0.15s ease" }}>
                      <span style={{ fontSize:14, fontWeight:800, color:checked?"#FF5A4E":"var(--text)", fontFamily:"Syne,sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{module}</span>
                      <div style={{ width:18, height:18, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", background:checked?"#FF5A4E":"transparent", border:checked?"1px solid #FF5A4E":"1px solid rgba(255,255,255,0.18)", color:"#fff", fontSize:14, fontWeight:900, transition:"all 0.15s ease" }}>{checked?"✓":""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => {
                if (!editUserId) return;
                const updates: Record<string,any> = { fullName:editForm.fullname||"", email:editForm.email||"", pin:editForm.pin||"", role:editForm.role||"cashier", cashierId:editForm.cashierId||"", permissions:editForm.permissions||[], isActive:editForm.isActive??true, branch:editForm.branch||"" };
                if (editForm.password) updates.password = editForm.password;
                updateUserData(editUserId, updates);
                setEditUserId(null);
              }} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"Syne,sans-serif", background:"linear-gradient(135deg,#60A5FA,#2563EB)", color:"white" }}>SAVE CHANGES</button>
              <button onClick={() => setEditUserId(null)} style={{ flex:1, padding:"12px", borderRadius:10, background:"transparent", border:"1px solid var(--border)", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADD USER MODAL
      ══════════════════════════════════════════ */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setShowAdd(false)}>
          <div style={{ background:"var(--modal-bg)", border:"1px solid var(--primary-border)", borderRadius:20, padding:"28px", width:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:20, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:4 }}>ADD NEW USER</h3>
            <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:22 }}>Create cashier, admin or waiter account</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
              {[
                { label:"Full Name",     key:"fullname",  placeholder:"Mohammed Ali",      type:"text",     show:true },
                { label:"Cashier ID",    key:"cashierId", placeholder:"C04",               type:"text",     show:true },
                { label:"Email Address", key:"email",     placeholder:"user@restopos.com", type:"email",    show:form.role!=="waiter" },
                { label:"Password",      key:"password",  placeholder:"min 6 chars",       type:"password", show:form.role!=="waiter" },
                { label:"PIN",           key:"pin",       placeholder:"1234",              type:"password", show:true },
              ].filter(f=>f.show).map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:5 }}>{f.label.toUpperCase()}</label>
                  <input type={f.type} placeholder={f.placeholder} value={String((form as Record<string,unknown>)[f.key] ?? "")} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{ width:"100%", background:"var(--input-bg)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"11px 12px", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"Syne,sans-serif", boxSizing:"border-box" }} />
                </div>
              ))}
            </div>

            {/* Branch */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>BRANCH</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {branches.map(br => (
                  <button key={br.id} onClick={() => setForm(p=>({...p,branch:br.name}))}
                    style={{ padding:"11px 16px", minHeight:44, borderRadius:9, border:`1px solid ${form.branch===br.name?"var(--primary)":"var(--border)"}`, background:form.branch===br.name?"var(--primary-bg)":"rgba(255,255,255,0.03)", color:form.branch===br.name?"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif", whiteSpace:"nowrap" }}>
                    🏪 {br.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>ROLE</label>
              <div style={{ display:"flex", gap:10 }}>
                {(["cashier","cook","admin","waiter"] as (UserRole|"waiter")[]).map(r => (
                  <button key={r} onClick={() => setForm(p=>({...p,role:r}))}
                    style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${form.role===r?(ROLE_CFG[r]?.color??"var(--primary)")+"60":"var(--border)"}`, background:form.role===r?ROLE_CFG[r]?.bg??"var(--primary-bg)":"rgba(255,255,255,0.03)", color:form.role===r?ROLE_CFG[r]?.color??"var(--primary)":"var(--text-dim)", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                    {r==="admin"?"🛡 ADMIN":r==="cook"?"👨‍🍳 COOK":r==="waiter"?"🧑‍🍽 WAITER":"👤 CASHIER"}
                  </button>
                ))}
              </div>
              {form.role === "waiter" && (
                <p style={{ fontSize:14, color:"#F472B6", marginTop:8, fontStyle:"italic" }}>ℹ️ Waiters don&apos;t have login access — only accessible in the Users tab.</p>
              )}
            </div>

            {/* Access control */}
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:600, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:12 }}>ACCESS CONTROL</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {ACCESS_MODULES.map(module => {
                  const checked = form.permissions.includes(module);
                  return (
                    <div key={module} onClick={() => setForm(prev=>({ ...prev, permissions: checked?prev.permissions.filter(p=>p!==module):[...prev.permissions,module] }))}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderRadius:14, background:checked?"rgba(255,68,68,0.08)":"rgba(255,255,255,0.03)", border:checked?"1px solid rgba(255,68,68,0.25)":"1px solid var(--border)", cursor:"pointer", transition:"all 0.15s ease" }}>
                      <span style={{ fontSize:14, fontWeight:800, color:checked?"#FF5A4E":"var(--text)", fontFamily:"Syne,sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{module}</span>
                      <div style={{ width:20, height:20, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:checked?"#FF5A4E":"transparent", border:checked?"1px solid #FF5A4E":"1px solid rgba(255,255,255,0.18)", color:"#fff", fontSize:14, fontWeight:900, transition:"all 0.15s ease" }}>{checked?"✓":""}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {formErr && <p style={{ color:"#FF6B6B", fontSize:14, fontWeight:600, marginBottom:14 }}>{formErr}</p>}

            <div style={{ display:"flex", gap:10 }}>
              <button type="button" onClick={handleAddUser}
                style={{ flex:1, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", fontSize:15, fontWeight:800, fontFamily:"Syne,sans-serif", letterSpacing:"0.05em", background:"linear-gradient(135deg,var(--primary),#8B6010)", color:"var(--bg)", height:55 }}>
                ✓ CREATE USER
              </button>
              <button onClick={() => { setShowAdd(false); setFormErr(""); }}
                style={{ padding:"13px 20px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"var(--text-dim)", fontSize:17, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif", height:55 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CASH ENTRY MODAL
      ══════════════════════════════════════════ */}
      {showCashModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowCashModal(false)}>
          <div style={{ background:"var(--modal-bg)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"32px", width:360, boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize:32, textAlign:"center", marginBottom:8 }}>💵</p>
            <h3 style={{ fontSize:18, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:4, textAlign:"center" }}>CASH RECEIVED</h3>
            <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:20, textAlign:"center" }}>Enter cash amount received from customer</p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:14, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", display:"block", marginBottom:8 }}>CASH AMOUNT (AR)</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:700, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR</span>
                <input type="number" min="0" placeholder="0.00" value={cashEntry} onChange={e => setCashEntry(e.target.value)} autoFocus
                  style={{ width:"100%", background:"var(--input-bg)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:12, padding:"14px 16px 14px 60px", color:"var(--text)", fontSize:22, fontWeight:800, outline:"none", fontFamily:"Syne,sans-serif", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
              {[50,100,200,500].map(amt => (
                <button key={amt} onClick={() => setCashEntry(String(amt))}
                  style={{ padding:"7px 16px", borderRadius:8, border:"1px solid rgba(34,197,94,0.2)", background:cashEntry===String(amt)?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.03)", color:cashEntry===String(amt)?"#22C55E":"var(--text-muted)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
                  {amt}
                </button>
              ))}
            </div>
            {parseFloat(cashEntry) > 0 && session.cashTransactions.length > 0 && (
              <div style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:14, color:"var(--text-muted)" }}>Change Due</span>
                <span style={{ fontSize:18, fontWeight:800, color:"#60A5FA", fontFamily:"Syne,sans-serif" }}>SR {Math.max(0, parseFloat(cashEntry)-(session.cashTransactions[0]?.amount||0)).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setShowCashModal(false); setCashEntry(""); }} style={{ padding:"12px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>Cancel</button>
              <button onClick={() => { setShowCashModal(false); setCashEntry(""); }} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"Syne,sans-serif", background:"linear-gradient(135deg,#22C55E,#15803D)", color:"white", boxShadow:"0 4px 14px rgba(34,197,94,0.3)" }}>✓ CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════ */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setConfirmDel(null)}>
          <div style={{ background:"var(--modal-bg)", border:"1px solid rgba(255,68,68,0.3)", borderRadius:20, padding:"32px", width:320, boxShadow:"0 32px 80px rgba(0,0,0,0.8)", textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontSize:16, fontWeight:800, color:"var(--text)", fontFamily:"Syne,sans-serif", marginBottom:8 }}>Remove User?</h3>
            <p style={{ fontSize:14, color:"var(--text-dim)", marginBottom:24 }}>{users.find(u=>u.id===confirmDel)?.name} will lose access immediately.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { if (confirmDel) deleteUserData(confirmDel); setConfirmDel(null); }}
                style={{ flex:1, padding:"12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"Syne,sans-serif", background:"#FF4444", color:"white" }}>REMOVE</button>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding:"12px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"var(--text-dim)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PROCUREMENT DETAIL MODAL
      ══════════════════════════════════════════ */}
      {selectedProcReq && (() => {
        const req = selectedProcReq;
        const statusCfg: Record<string,{color:string;bg:string;border:string}> = {
          pending:   { color:"#FBBF24", bg:"rgba(251,191,36,0.12)",  border:"rgba(251,191,36,0.3)"  },
          received:  { color:"#22C55E", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"   },
          cancelled: { color:"#FF6B6B", bg:"rgba(255,107,107,0.12)", border:"rgba(255,107,107,0.3)" },
        };
        const cfg   = statusCfg[req.status] ?? statusCfg.pending;
        const items: any[] = Array.isArray(req.items) ? req.items : [];
        const createdDate = req.createdAt ? new Date(req.createdAt).toLocaleString([], { dateStyle:"medium", timeStyle:"short" }) : "—";
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
            onClick={() => setSelectedProcReq(null)}>
            <div style={{ background:"var(--modal-bg)", border:"1px solid var(--border)", borderRadius:20, padding:"28px", width:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div>
                  <p style={{ fontSize:12, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.1em", fontFamily:"Syne,sans-serif", margin:"0 0 4px" }}>📦 PROCUREMENT REQUEST</p>
                  <h2 style={{ fontSize:16, fontWeight:800, color:"var(--primary)", fontFamily:"Syne,sans-serif", margin:0 }}>{req.referenceId ?? req._id}</h2>
                  <p style={{ fontSize:13, color:"var(--text-dim)", margin:"4px 0 0" }}>{createdDate}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}`, padding:"4px 12px", borderRadius:20, fontFamily:"Syne,sans-serif", textTransform:"uppercase" }}>{req.status}</span>
                  <button onClick={() => setSelectedProcReq(null)} style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color:"var(--text-dim)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Type badge */}
              <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--text-dim)", background:"var(--input-bg)", border:"1px solid var(--border)", padding:"3px 10px", borderRadius:20, fontFamily:"Syne,sans-serif", textTransform:"uppercase" }}>
                  {req.type === "manual" ? "✏️ Manual Entry" : "📋 Request"}
                </span>
              </div>

              {/* Items table */}
              <p style={{ fontSize:13, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:8 }}>ITEMS</p>
              <div style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", marginBottom:18 }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:0, background:"rgba(255,255,255,0.03)", padding:"8px 14px", borderBottom:"1px solid var(--border)" }}>
                  {["ITEM","QTY","UNIT","PRICE/UNIT"].map(h => (
                    <span key={h} style={{ fontSize:12, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif" }}>{h}</span>
                  ))}
                </div>
                {items.length === 0 ? (
                  <p style={{ padding:"14px", fontSize:13, color:"var(--text-dim)", textAlign:"center" }}>No items</p>
                ) : items.map((item: any, i: number) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:0, padding:"10px 14px", borderBottom: i < items.length-1 ? "1px solid var(--border)" : "none", background: i%2===0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:"var(--text)", fontFamily:"Syne,sans-serif" }}>{item.name ?? "—"}</span>
                    <span style={{ fontSize:14, color:"var(--text-muted)" }}>{item.quantity ?? item.qty ?? "—"}</span>
                    <span style={{ fontSize:14, color:"var(--text-dim)" }}>{item.unit ?? "—"}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>
                      {item.pricePerUnit != null ? `SR ${Number(item.pricePerUnit).toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:"var(--input-bg)", borderRadius:10, border:"1px solid var(--border)", marginBottom:18 }}>
                <span style={{ fontSize:14, fontWeight:700, color:"var(--text-dim)", fontFamily:"Syne,sans-serif" }}>TOTAL AMOUNT</span>
                <span style={{ fontSize:18, fontWeight:900, color:"#22C55E", fontFamily:"Syne,sans-serif" }}>SR {(req.totalAmount ?? 0).toFixed(2)}</span>
              </div>

              {/* Notes */}
              {req.notes && (
                <div style={{ marginBottom:18 }}>
                  <p style={{ fontSize:13, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:6 }}>NOTES</p>
                  <p style={{ fontSize:14, color:"var(--text-muted)", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 14px", margin:0 }}>{req.notes}</p>
                </div>
              )}

              {/* Status actions */}
              <div>
                <p style={{ fontSize:13, color:"var(--text-dim)", fontWeight:700, letterSpacing:"0.08em", fontFamily:"Syne,sans-serif", marginBottom:8 }}>UPDATE STATUS</p>
                <div style={{ display:"flex", gap:8 }}>
                  {(["pending","received","cancelled"] as const).map(s => {
                    const sc = statusCfg[s];
                    const isActive = req.status === s;
                    return (
                      <button key={s} disabled={isActive}
                        onClick={async () => {
                          try {
                            await api.patch(`/procurement/${req._id}`, { status: s });
                            setSelectedProcReq({ ...req, status: s });
                            setProcRequests(prev => prev.map((r:any) => r._id === req._id ? { ...r, status: s } : r));
                          } catch (err) { console.error("STATUS UPDATE ERROR:", err); }
                        }}
                        style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${isActive ? sc.border : "var(--border)"}`, background: isActive ? sc.bg : "var(--input-bg)", color: isActive ? sc.color : "var(--text-dim)", fontSize:13, fontWeight:800, cursor: isActive ? "default" : "pointer", fontFamily:"Syne,sans-serif", textTransform:"uppercase", letterSpacing:"0.06em", transition:"all 0.15s" }}>
                        {s === "pending" ? "⏳ Pending" : s === "received" ? "✅ Received" : "❌ Cancelled"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}