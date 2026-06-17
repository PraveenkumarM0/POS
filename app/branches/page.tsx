"use client";
import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import api from "@/lib/api";
import "./branches.css";

type Branch = {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
  createdAt?: string;
};

type AddForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  manager: string;
};

const EMPTY_FORM: AddForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  manager: "",
};

function BranchIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="9,22 9,12 15,12 15,22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BRANCH_COLORS = [
  "var(--primary)",
  "#60A5FA",
  "#22C55E",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#FB923C",
  "#34D399",
];

const DUMMY_BRANCHES: Branch[] = [
  {
    id: "dummy-1",
    name: "Main Branch",
    code: "BR-01",
    address: "King Fahd Road, Riyadh",
    phone: "+966 50 123 4567",
    manager: "Mohammed Al-Rashid",
    isActive: true,
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "dummy-2",
    name: "Downtown Branch",
    code: "BR-02",
    address: "Al Olaya District, Riyadh",
    phone: "+966 50 234 5678",
    manager: "Sara Al-Qahtani",
    isActive: true,
    createdAt: "2024-02-20T09:00:00Z",
  },
  {
    id: "dummy-3",
    name: "Mall Branch",
    code: "BR-03",
    address: "Riyadh Gallery Mall, Level 2",
    phone: "+966 50 345 6789",
    manager: "Ahmed Al-Dosari",
    isActive: true,
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "dummy-4",
    name: "Airport Branch",
    code: "BR-04",
    address: "King Khalid International Airport",
    phone: "+966 50 456 7890",
    manager: "Fatima Al-Ghamdi",
    isActive: false,
    createdAt: "2024-04-05T11:00:00Z",
  },
  {
    id: "dummy-5",
    name: "North Branch",
    code: "BR-05",
    address: "Al Nakheel District, Riyadh",
    phone: "+966 50 567 8901",
    manager: "Khalid Al-Otaibi",
    isActive: true,
    createdAt: "2024-05-18T12:00:00Z",
  },
];

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<AddForm>(EMPTY_FORM);
  const [formErr, setFormErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/branches");
      const data = res.data?.data ?? res.data?.branches ?? res.data ?? [];
      const mapped = (Array.isArray(data) ? data : []).map((b: any) => ({
        id: b._id || b.id,
        name: b.name || "",
        code: b.code || "",
        address: b.address || "",
        phone: b.phone || "",
        manager: b.manager || "",
        isActive: typeof b.isActive === "boolean" ? b.isActive : true,
        createdAt: b.createdAt,
      }));
      setBranches(mapped.length > 0 ? mapped : DUMMY_BRANCHES);
    } catch (err) {
      console.error("LOAD BRANCHES ERROR:", err);
      setBranches(DUMMY_BRANCHES);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const validate = (f: AddForm) => {
    if (!f.name.trim()) return "Branch name is required.";
    if (!f.code.trim()) return "Branch code is required.";
    return "";
  };

  const handleAdd = async () => {
    setFormErr("");
    const err = validate(form);
    if (err) { setFormErr(err); return; }
    try {
      await api.post("/branches", {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        manager: form.manager.trim(),
        isActive: true,
      });
      await loadBranches();
      setShowAdd(false);
      setForm(EMPTY_FORM);
      message.success('Branch created successfully');
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || "Failed to create branch.";
      setFormErr(errMsg);
      message.error(errMsg);
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    setFormErr("");
    const err = validate(editForm);
    if (err) { setFormErr(err); return; }
    try {
      await api.patch(`/branches/${editId}`, {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        manager: editForm.manager.trim(),
      });
      await loadBranches();
      setEditId(null);
      message.success('Branch updated successfully');
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || "Failed to update branch.";
      setFormErr(errMsg);
      message.error(errMsg);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await api.patch(`/branches/${id}`, { isActive: !current });
      await loadBranches();
      message.success(current ? 'Branch deactivated' : 'Branch activated');
    } catch {
      message.error('Failed to update branch status');
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      await api.delete(`/branches/${id}`);
      await loadBranches();
      setConfirmDel(null);
      message.success('Branch removed');
    } catch {
      message.error('Failed to remove branch');
    }
  };

  const filtered = branches
    .filter((b) =>
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.manager.toLowerCase().includes(search.toLowerCase())
    )
    .filter((b) =>
      filterActive === "all" ? true : filterActive === "active" ? b.isActive : !b.isActive
    );

  const activeCnt = branches.filter((b) => b.isActive).length;
  const inactiveCnt = branches.length - activeCnt;

  return (
    <div className="br-root">
      {/* Header */}
      <div className="br-header">
        <div className="br-header-left">
          <div className="br-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="9,22 9,12 15,12 15,22"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="br-eyebrow">BRANCH MANAGEMENT</p>
            <h1 className="br-title">Branches</h1>
          </div>
        </div>
        <button className="br-add-btn" onClick={() => { setForm(EMPTY_FORM); setFormErr(""); setShowAdd(true); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          ADD BRANCH
        </button>
      </div>

      {/* Body */}
      <div className="br-body">
        {/* Stats row */}
        <div className="br-stats">
          <div className="br-stat-card" style={{ borderTopColor: "var(--primary)" }}>
            <p className="br-stat-label">TOTAL BRANCHES</p>
            <p className="br-stat-value" style={{ color: "var(--primary)" }}>{loading ? "…" : branches.length}</p>
          </div>
          <div className="br-stat-card" style={{ borderTopColor: "#22C55E" }}>
            <p className="br-stat-label">ACTIVE</p>
            <p className="br-stat-value" style={{ color: "#22C55E" }}>{loading ? "…" : activeCnt}</p>
          </div>
          <div className="br-stat-card" style={{ borderTopColor: "#FF4444" }}>
            <p className="br-stat-label">INACTIVE</p>
            <p className="br-stat-value" style={{ color: "#FF4444" }}>{loading ? "…" : inactiveCnt}</p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="br-toolbar">
          <input
            className="br-search"
            placeholder="Search by name, code or manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="br-filter-group">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`br-filter-btn ${filterActive === f ? "active" : ""}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="br-empty">
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="br-empty">
            <p style={{ fontSize: 36, marginBottom: 10 }}>🏢</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "Syne,sans-serif", marginBottom: 4 }}>
              {branches.length === 0 ? "No branches yet" : "No results found"}
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {branches.length === 0 ? "Add your first branch to get started." : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <div className="br-grid">
            {filtered.map((branch, idx) => {
              const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
              return (
                <div
                  key={branch.id}
                  className={`br-card ${!branch.isActive ? "br-card--inactive" : ""}`}
                  style={{ "--branch-color": color } as React.CSSProperties}
                >
                  <div className="br-card-top-bar" />
                  {!branch.isActive && <span className="br-inactive-badge">INACTIVE</span>}

                  <div className="br-card-header">
                    <div className="br-card-icon">
                      <BranchIcon color={color} />
                    </div>
                    <span className="br-card-code" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
                      {branch.code}
                    </span>
                  </div>

                  <p className="br-card-name">{branch.name}</p>

                  {branch.address && (
                    <p className="br-card-meta">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {branch.address}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="br-card-meta">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.1 11.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.04 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {branch.phone}
                    </p>
                  )}
                  {branch.manager && (
                    <p className="br-card-meta">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {branch.manager}
                    </p>
                  )}

                  <div className="br-card-footer">
                    <p className="br-card-date">
                      {branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : "—"}
                    </p>
                    <div className="br-card-actions">
                      <button
                        className="br-action-btn br-edit-btn"
                        onClick={() => {
                          setEditId(branch.id);
                          setEditForm({ name: branch.name, code: branch.code, address: branch.address, phone: branch.phone, manager: branch.manager });
                          setFormErr("");
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className={`br-action-btn ${branch.isActive ? "br-deactivate-btn" : "br-activate-btn"}`}
                        onClick={() => toggleActive(branch.id, branch.isActive)}
                      >
                        {branch.isActive ? "⏸️" : "▶️"}
                      </button>
                      <button
                        className="br-action-btn br-delete-btn"
                        onClick={() => setConfirmDel(branch.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -- ADD MODAL -- */}
      {showAdd && (
        <div className="br-overlay" onClick={() => setShowAdd(false)}>
          <div className="br-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="br-modal-title">ADD NEW BRANCH</h3>
            <p className="br-modal-sub">Create a new restaurant branch location</p>
            <BranchFormFields form={form} setForm={setForm} />
            {formErr && <p className="br-form-err">{formErr}</p>}
            <div className="br-modal-actions">
              <button className="br-btn-primary" onClick={handleAdd}>✔ CREATE BRANCH</button>
              <button className="br-btn-cancel" onClick={() => { setShowAdd(false); setFormErr(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* -- EDIT MODAL -- */}
      {editId && (
        <div className="br-overlay" onClick={() => setEditId(null)}>
          <div className="br-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="br-modal-title">EDIT BRANCH</h3>
            <p className="br-modal-sub">Update details for {branches.find(b => b.id === editId)?.name}</p>
            <BranchFormFields form={editForm} setForm={setEditForm} />
            {formErr && <p className="br-form-err">{formErr}</p>}
            <div className="br-modal-actions">
              <button className="br-btn-edit" onClick={handleEdit}>SAVE CHANGES</button>
              <button className="br-btn-cancel" onClick={() => { setEditId(null); setFormErr(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* -- DELETE CONFIRM -- */}
      {confirmDel && (
        <div className="br-overlay" onClick={() => setConfirmDel(null)}>
          <div className="br-modal br-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="br-del-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="br-modal-title" style={{ textAlign: "center" }}>Remove Branch?</h3>
            <p className="br-modal-sub" style={{ textAlign: "center" }}>
              <strong style={{ color: "var(--text)" }}>{branches.find(b => b.id === confirmDel)?.name}</strong> and all associated data will be removed permanently.
            </p>
            <div className="br-modal-actions">
              <button className="br-btn-danger" onClick={() => deleteBranch(confirmDel)}>REMOVE</button>
              <button className="br-btn-cancel" onClick={() => setConfirmDel(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Shared form fields --
function BranchFormFields({
  form,
  setForm,
}: {
  form: AddForm;
  setForm: React.Dispatch<React.SetStateAction<AddForm>>;
}) {
  const fields: { label: string; key: keyof AddForm; placeholder: string; type?: string }[] = [
    { label: "Branch Name", key: "name", placeholder: "e.g. Main Branch" },
    { label: "Branch Code", key: "code", placeholder: "e.g. BR-01" },
    { label: "Address", key: "address", placeholder: "Street, City" },
    { label: "Phone", key: "phone", placeholder: "+966 5X XXX XXXX", type: "tel" },
    { label: "Manager Name", key: "manager", placeholder: "Mohammed Al-Rashid" },
  ];

  return (
    <div className="br-form-grid">
      {fields.map((f) => (
        <div key={f.key} className={f.key === "address" ? "br-form-full" : ""}>
          <label className="br-form-label">{f.label.toUpperCase()}</label>
          <input
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
            className="br-form-input"
          />
        </div>
      ))}
    </div>
  );
}

