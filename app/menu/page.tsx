"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { message, Modal } from "antd";
import Link from "next/link";
import api, { API_ORIGIN } from "@/lib/api";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import OrderPanel from "@/components/OrderPanel";
import "./menu.css";

/* ── API Types ── */
interface ApiCategory {
  _id: string;
  name: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface ApiMenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: { _id: string; name: string } | string;
  imageUrl?: string;
  isAvailable?: boolean;
  itemType?: string;
  variantType?: string;
  variants?: { label: string; price: number }[];
  tags?: string[];
  code?: string;
}

/* ── Local shape used by UI ── */
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  img: string;
  category: string;
  itemType?: 'veg' | 'non_veg';
  variantType?: string;
  variants?: { label: string; price: number }[];
  code?: string;
}

type MenuVariant = { label: string; price: number };

interface Category {
  id: string;
  name: string;
  img: string | null;
  items: MenuItem[];
}

// Returns null when there is no real image — caller renders a placeholder div
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pos-be-zni5.onrender.com";

function resolveImg(url?: string | null): string | null {
  if (!url) return null;

  const cleanUrl = url.trim();

  if (!cleanUrl) return null;

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://")
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("/")) {
    return `${API_URL}${cleanUrl}`;
  }

  return `${API_URL}/${cleanUrl}`;
}

// Inline data-URI used as error fallback so no extra HTTP request is made
const ERR_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

function imgOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null; // prevent infinite loop
  e.currentTarget.src = ERR_URI;
  // show the parent placeholder bg by hiding the broken img
  e.currentTarget.style.opacity = "0";
}

const imgFill: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

// Placeholder shown when no image URL is available — zero HTTP requests
function ImgPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--input-bg)",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 19H3a1 1 0 01-1-1V6a1 1 0 011-1h18a1 1 0 011 1v12a1 1 0 01-1 1z"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M3 15l5-5 4 4 3-3 6 6"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="9" r="1.5" fill="var(--border)" />
      </svg>
    </div>
  );
}
function mapCategory(c: ApiCategory): Category {
  return {
    id: c._id,
    name: c.name,
    img: resolveImg(c.imageUrl),
    items: [],
  };
}

function mapItem(i: ApiMenuItem): MenuItem {
  const catObj = i.category as {
    _id: string;
    name: string;
  };

  return {
    id: i._id,
    name: i.name,
    price: i.price,
    description: i.description || "",
    img: resolveImg(i.imageUrl || (i as any).image || (i as any).imagePath) || "",
    category: typeof catObj === "string" ? catObj : catObj?.name || "",
    itemType: (i.itemType as 'veg' | 'non_veg') || 'veg',
    code: i.code || "",
    ...(i.variants?.length
      ? { variantType: i.variantType || "Size", variants: i.variants }
      : {}),
  };
}

/* ── Icons ── */
function CatIcon({ id, active }: { id: string; active: boolean }) {
  const color = active ? "var(--primary)" : "#666660";
  const icons: Record<string, React.ReactNode> = {
    barbeque: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="14" r="5" stroke={color} strokeWidth="2" />
        <path
          d="M12 9V5M8 5h8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8 21l2-2M16 21l-2-2"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    drinks: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M8 3l-1 8h10L16 3H8z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 11l1 8a1 1 0 001 1h6a1 1 0 001-1l1-8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    sweets: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C8 2 4 6 4 10c0 5 4 10 8 12 4-2 8-7 8-12 0-4-4-8-8-8z"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    ),
    snacks: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect
          x="6"
          y="14"
          width="12"
          height="7"
          rx="2"
          stroke={color}
          strokeWidth="2"
        />
        <path
          d="M8 14V8a4 4 0 018 0v6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  };
  return (
    <>
      {/* {icons[id] ?? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <path
            d="M8 12h8M12 8v8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )} */}
    </>
  );
}

/* ── Item Detail Popup ── */
function ItemDetailPopup({
  item,
  catName,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  catName?: string;
  onClose: () => void;
  onAdd: (item: MenuItem, variant?: MenuVariant) => void;
}) {
  const hasVariants = item.variants && item.variants.length > 0;
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const displayPrice = hasVariants
    ? item.variants![selectedVariant].price
    : item.price;

  const handleAdd = () => {
    onAdd(item, hasVariants ? item.variants![selectedVariant] : undefined);
    onClose();
  };

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div
        className="menu-modal-box anim-scale"
        style={{ width: 480, padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 220,
            background: "var(--input-bg)",
            overflow: "hidden",
          }}
        >
          {resolveImg(item.img) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolveImg(item.img) || ""}
              alt={item.name}
              onError={(e) => {
                console.log("FAILED IMAGE", item.img);
                imgOnError(e);
              }}
              style={{ ...imgFill, height: 220 }}
            />
          ) : (
            <ImgPlaceholder />
          )}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.55)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
          {catName && (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "var(--primary)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 20,
                fontFamily: "Syne,sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              {catName.toUpperCase()}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              background: "rgba(0,0,0,0.75)",
              color: "var(--primary)",
              fontSize: 14,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20,
              fontFamily: "Syne,sans-serif",
            }}
          >
            SR {displayPrice}
          </div>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text)",
              fontFamily: "Syne,sans-serif",
              margin: "0 0 6px",
            }}
          >
            {item.name}
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-dim)",
              margin: "0 0 18px",
              lineHeight: 1.5,
            }}
          >
            {item.description}
          </p>
          {hasVariants ? (
            <div style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-dim)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  fontFamily: "Syne,sans-serif",
                  margin: "0 0 10px",
                }}
              >
                SELECT {(item.variantType || "SIZE").toUpperCase()}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {item.variants!.map((v, idx) => (
                  <button
                    key={v.label}
                    onClick={() => setSelectedVariant(idx)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      border: `1.5px solid ${selectedVariant === idx ? "var(--primary)" : "var(--border)"}`,
                      background:
                        selectedVariant === idx
                          ? "var(--primary-bg)"
                          : "var(--input-bg)",
                      color:
                        selectedVariant === idx
                          ? "var(--primary)"
                          : "var(--text-dim)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        fontFamily: "Syne,sans-serif",
                      }}
                    >
                      {v.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      SR {v.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginBottom: 20,
                padding: "10px 14px",
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-dim)" }}>
                Price
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--primary)",
                  fontFamily: "Syne,sans-serif",
                }}
              >
                SR {item.price}
              </span>
            </div>
          )}
          <button
            onClick={handleAdd}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "Syne,sans-serif",
              letterSpacing: "0.05em",
              background:
                "linear-gradient(135deg,var(--primary),var(--primary-dim))",
              color: "white",
              boxShadow: "0 4px 18px rgba(232,68,58,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            ADD TO ORDER — SR {displayPrice}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Item Card ── */
function ItemCard({
  item,
  catName,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  catName?: string;
  onOpenDetail: (item: MenuItem) => void;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (item: MenuItem) => void;
}) {
  return (
    <div className="menu-item-card anim-up" style={{ position: "relative" }}>
      <div
        className="menu-item-img-wrap"
        onClick={() => onOpenDetail(item)}
        style={{ cursor: "pointer" }}
      >
        {resolveImg(item.img) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolveImg(item.img)!}
            alt={item.name}
            onError={imgOnError}
            style={imgFill}
          />
        ) : (
          <ImgPlaceholder />
        )}
        <div className="menu-item-price-badge">
          <span>SR {item.variants ? item.variants[0].price : item.price}</span>
        </div>
        {catName && (
          <div className="menu-item-cat-badge">
            <span>{catName.toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="menu-item-body">
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
          {/* Veg / non-veg dot */}
          <div style={{ width: 10, height: 10, borderRadius: 2, border: `1.5px solid ${item.itemType === 'non_veg' ? '#EF4444' : '#22C55E'}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.itemType === 'non_veg' ? '#EF4444' : '#22C55E' }} />
          </div>
          <p
            className="menu-item-name"
            onClick={() => onOpenDetail(item)}
            style={{ cursor: "pointer", margin: 0 }}
          >
            {item.name}
          </p>
          {item.code && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 5, padding: "1px 5px", fontFamily: "monospace", letterSpacing: "0.04em", flexShrink: 0 }}>
              {item.code}
            </span>
          )}
        </div>
        <p className="menu-item-desc">{item.description}</p>
        {/* {item.variants && item.variants.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {item.variants.map((v) => (
              <span
                key={v.label}
                style={{
                  fontSize: 14,
                  padding: "2px 7px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  color: "var(--text-dim)",
                  fontWeight: 700,
                  fontFamily: "Syne,sans-serif",
                }}
              >
                {v.label}
              </span>
            ))}
          </div>
        )} */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="menu-add-btn"
            style={{ flex: 1 }}
            onClick={() => onOpenDetail(item)}
          >
            + ADD TO ORDER
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit?.(item)}
              className="menu-card-action-btn"
              title="Edit item"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete?.(item)}
              className="menu-card-action-btn menu-card-delete-btn"
              title="Delete item"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function MenuPage() {
  const { isAdmin, session } = useAuth();
  const canManageMenu = isAdmin || (session?.user?.permissions ?? []).includes("menu");
  const [cats, setCats] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    name: "",
    price: "",
    description: "",
    img: "",
    variantType: "",
    categoryId: "",
    itemType: "veg" as "veg" | "non_veg",
    code: "",
  });
  const [addItemVariants, setAddItemVariants] = useState<
    { label: string; price: string }[]
  >([]);
  const [addCatForm, setAddCatForm] = useState({ name: "", img: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
    img: "",
    variantType: "",
    categoryId: "",
    itemType: "veg" as "veg" | "non_veg",
    code: "",
  });
  const [editVariants, setEditVariants] = useState<
    { label: string; price: string }[]
  >([]);
  const [addItemFile, setAddItemFile] = useState<File | null>(null);
  const [editItemFile, setEditItemFile] = useState<File | null>(null);
  const [addCatFile, setAddCatFile] = useState<File | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", img: "" });
  const [editCatFile, setEditCatFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const catImageInputRef = useRef<HTMLInputElement>(null);
  const editCatImageInputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useCart();


  /* ── Load categories + items ── */
  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([
        api.get("/menu/categories"),
        api.get("/menu/items"),
      ]);

      console.log("CATEGORY RESPONSE", catRes.data);
      console.log("ITEM RESPONSE", itemRes.data);

      const apiCats: ApiCategory[] =
        catRes.data.data || catRes.data.categories || catRes.data || [];
      const apiItems: ApiMenuItem[] =
        itemRes.data.data || itemRes.data.items || itemRes.data || [];

      const mapped: Category[] = apiCats.map(mapCategory);

      apiItems.forEach((apiItem) => {
        const catRef = apiItem.category;
        const catId =
          typeof catRef === "string"
            ? catRef
            : (catRef as { _id: string })?._id;
        const cat = mapped.find((c) => c.id === catId);
        if (cat) cat.items.push(mapItem(apiItem));
      });

      setCats(mapped);
      setActiveCatId((prev) => prev || mapped[0]?.id || "");
    } catch (err) {
      console.error("LOAD MENU ERROR:", err);
      message.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const activeCat = cats.find((c) => c.id === activeCatId) || cats[0];

  /* ── Cart ── */
  const handleAdd = (item: MenuItem, variant?: MenuVariant) => {
    const price = variant ? variant.price : item.price;
    const name = variant ? item.name + " (" + variant.label + ")" : item.name;
    addItem({
      id: item.id + (variant ? "_" + variant.label : ""),
      name,
      price,
      img: item.img,
    });
    message.success("Added: " + name);
  };

  /* ── Image upload — store File for FormData, object URL for preview ── */
  const MAX_IMG_MB = 2;

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string) => void,
    setFile: (f: File | null) => void,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMG_MB * 1024 * 1024) {
      message.error(`Image too large — max ${MAX_IMG_MB} MB`);
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  /* ── Search ── */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const results: { cat: Category; item: MenuItem }[] = [];
    cats.forEach((cat) => {
      if (cat.name.toLowerCase().includes(q)) {
        cat.items
          .filter(item => vegFilter === 'all' || item.itemType === vegFilter)
          .forEach((item) => results.push({ cat, item }));
      } else {
        cat.items
          .filter(item => vegFilter === 'all' || item.itemType === vegFilter)
          .forEach((item) => {
            if (
              item.name.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              (item.code && item.code.toLowerCase().includes(q))
            )
              results.push({ cat, item });
          });
      }
    });
    return results;
  }, [searchQuery, cats, vegFilter]);

  /* ── Add Item ── */
  const handleAddItem = async () => {
    if (!addItemForm.name || !addItemForm.price) return;
    try {
      const catId = addItemForm.categoryId || activeCat?.id || "";
      const variants = addItemVariants
        .filter((v) => v.label && v.price)
        .map((v) => ({ label: v.label, price: parseFloat(v.price) }));

      const fd = new FormData();
      fd.append("name", addItemForm.name);
      fd.append("description", addItemForm.description);
      fd.append("price", addItemForm.price);
      fd.append("category", catId);
      fd.append("itemType", addItemForm.itemType);
      if (addItemForm.code) fd.append("code", addItemForm.code);
      fd.append(
        "variantType",
        variants.length > 0 ? addItemForm.variantType || "size" : "none",
      );
      fd.append("variants", JSON.stringify(variants));
      if (addItemFile) fd.append("image", addItemFile, addItemFile.name);
      else if (addItemForm.img) fd.append("imageUrl", addItemForm.img);

      await api.post("/menu/items", fd);
      await loadMenu();
      setAddItemForm({
        name: "",
        price: "",
        description: "",
        img: "",
        variantType: "",
        categoryId: "",
        itemType: "veg",
        code: "",
      });
      setAddItemFile(null);
      setAddItemVariants([]);
      setShowAddItem(false);
      message.success('"' + addItemForm.name + '" added!');
    } catch (err: any) {
      console.error("ADD ITEM ERROR:", err?.response?.data || err);
      message.error(err?.response?.data?.message || "Failed to add item");
    }
  };

  /* ── Edit Item ── */
  const handleEditItem = async () => {
    if (!editItem || !editForm.name || !editForm.price) return;
    try {
      const variants = editVariants
        .filter((v) => v.label && v.price)
        .map((v) => ({ label: v.label, price: parseFloat(v.price) }));

      const fd = new FormData();
      fd.append("name", editForm.name);
      fd.append("description", editForm.description);
      fd.append("price", editForm.price);
      if (editForm.categoryId) fd.append("category", editForm.categoryId);
      fd.append("itemType", editForm.itemType || "veg");
      if (editForm.code) fd.append("code", editForm.code);
      fd.append(
        "variantType",
        variants.length > 0 ? editForm.variantType || "size" : "none",
      );
      fd.append("variants", JSON.stringify(variants));
      fd.append("isAvailable", "true");
      if (editItemFile) fd.append("image", editItemFile);
      else if (editForm.img && !editForm.img.startsWith("blob:"))
        fd.append("imageUrl", editForm.img);

      await api.patch(`/menu/items/${editItem.id}`, fd);
      await loadMenu();
      setEditItem(null);
      setEditItemFile(null);
      message.success('"' + editForm.name + '" updated!');
    } catch (err) {
      console.error("EDIT ITEM ERROR:", err);
      message.error("Failed to update item");
    }
  };

  const openEditModal = (item: MenuItem) => {
    const cat = cats.find((c) => c.items.some((i) => i.id === item.id));
    setEditItem(item);
    setEditForm({
      name: item.name,
      price: String(item.price),
      description: item.description,
      img: item.img,
      variantType: item.variantType || "",
      categoryId: cat?.id || "",
      itemType: item.itemType || "veg",
      code: item.code || "",
    });
    setEditVariants(
      item.variants
        ? item.variants.map((v) => ({ label: v.label, price: String(v.price) }))
        : [],
    );
  };

  /* ── Delete Item ── */
  const handleDeleteItem = (item: MenuItem) => {
    Modal.confirm({
      title: `Delete "${item.name}"?`,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/menu/items/${item.id}`);
          await loadMenu();
          message.success('"' + item.name + '" deleted');
        } catch (err) {
          console.error("DELETE ITEM ERROR:", err);
          message.error("Failed to delete item");
        }
      },
    });
  };

  /* ── Add Category ── */
  const handleAddCat = async () => {
    if (!addCatForm.name) return;
    try {
      const fd = new FormData();
      fd.append("name", addCatForm.name);
      fd.append("sortOrder", String(cats.length + 1));
      if (addCatFile) {
        fd.append("image", addCatFile, addCatFile.name);
      } else if (addCatForm.img) {
        fd.append("imageUrl", addCatForm.img);
      }

      await api.post("/menu/categories", fd);
      await loadMenu();
      setAddCatForm({ name: "", img: "" });
      setAddCatFile(null);
      setShowAddCat(false);
      message.success('Category "' + addCatForm.name + '" added!');
    } catch (err: any) {
      console.error("ADD CAT ERROR:", err?.response?.data || err);
      message.error(err?.response?.data?.message || "Failed to add category");
    }
  };

  /* ── Delete Category ── */
  const handleDeleteCat = (cat: Category) => {
    Modal.confirm({
      title: `Delete category "${cat.name}"?`,
      content: 'All items in this category will also be removed.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/menu/categories/${cat.id}`);
          await loadMenu();
          message.success('Category "' + cat.name + '" deleted');
        } catch (err) {
          console.error("DELETE CAT ERROR:", err);
          message.error("Failed to delete category");
        }
      },
    });
  };

  /* ── Edit Category ── */
  const openEditCat = (cat: Category) => {
    setEditCat(cat);
    setEditCatForm({ name: cat.name, img: cat.img || "" });
    setEditCatFile(null);
  };

  const handleEditCat = async () => {
    if (!editCat || !editCatForm.name) return;
    try {
      const fd = new FormData();
      fd.append("name", editCatForm.name);
      if (editCatFile) fd.append("image", editCatFile, editCatFile.name);
      else if (editCatForm.img && !editCatForm.img.startsWith("blob:"))
        fd.append("imageUrl", editCatForm.img);
      await api.patch(`/menu/categories/${editCat.id}`, fd);
      await loadMenu();
      setEditCat(null);
      setEditCatFile(null);
      message.success(`Category "${editCatForm.name}" updated!`);
    } catch (err: any) {
      console.error("EDIT CAT ERROR:", err?.response?.data || err);
      message.error(err?.response?.data?.message || "Failed to update category");
    }
  };

  return (
    <div className="menu-root">
      <div className="menu-main">
        {/* Header */}
        <div className="menu-header">
          {/* Category dropdown — LEFT */}
          {cats.length > 0 && (
            <select
              value={activeCatId}
              onChange={(e) => setActiveCatId(e.target.value)}
              className="menu-cat-select"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {/* Search */}
          <div className="menu-search-wrap">
            <svg
              className="menu-search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
                stroke="var(--text-dim)"
                strokeWidth="2"
              />
              <path
                d="M21 21l-4.35-4.35"
                stroke="var(--text-dim)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="menu-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="menu-search-clear"
              >
                ×
              </button>
            )}
          </div>
          <div className="menu-header-spacer" />
          {canManageMenu && (
            <Link href="/online-orders" className="menu-btn-online">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M2 12h20M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              ONLINE
              <span className="menu-btn-online-badge">3</span>
            </Link>
          )}
          {canManageMenu && (
            <button onClick={() => setShowAddItem(true)} className="menu-btn-add-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              ADD ITEM
            </button>
          )}
          {canManageMenu && (
            <button onClick={() => setShowAddCat(true)} className="menu-btn-add-cat">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              ADD CATEGORY
            </button>
          )}
        </div>

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: 14,
            }}
          >
            Loading menu…
          </div>
        ) : searchResults !== null ? (
          <div className="menu-search-results">
            <div className="menu-search-label">
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} for{" "}
              <span>"{searchQuery}"</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="menu-search-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                    stroke="var(--text-dim)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="var(--text-dim)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <p>No results found</p>
              </div>
            ) : (
              <div className="menu-items-grid">
                {searchResults.map(({ cat, item }) => (
                  <ItemCard
                    key={cat.id + "-" + item.id}
                    item={item}
                    catName={cat.name}
                    onOpenDetail={setDetailItem}
                    {...(canManageMenu ? { onEdit: openEditModal, onDelete: handleDeleteItem } : {})}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="menu-cat-tabs">
              {cats.map((cat) => {
                const isActive = activeCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCatId(cat.id)}
                    className={
                      "menu-cat-tab " + (isActive ? "active" : "inactive")
                    }
                  >
                    <div
                      className={
                        "menu-cat-tab-img " + (isActive ? "active" : "inactive")
                      }
                    >
                      {resolveImg(cat.img) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={resolveImg(cat.img)!}
                          alt={cat.name}
                          onError={imgOnError}
                          style={imgFill}
                        />
                      ) : (
                        <ImgPlaceholder />
                      )}
                      {isActive && <div className="menu-cat-tab-overlay" />}
                    </div>
                    <span
                      className={
                        "menu-cat-tab-name " +
                        (isActive ? "active" : "inactive")
                      }
                    >
                      {cat.name.toUpperCase()}
                    </span>
                    <span
                      className={
                        "menu-cat-tab-count " +
                        (isActive ? "active" : "inactive")
                      }
                    >
                      {cat.items.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile only: category dropdown — hidden on desktop via CSS */}
            <div className="menu-cat-dropdown-wrap">
              <select
                className="menu-cat-dropdown"
                value={activeCatId}
                onChange={(e) => setActiveCatId(e.target.value)}
              >
                {cats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.items.length})
                  </option>
                ))}
              </select>
            </div>

            {activeCat && (
              <>
                <div className="menu-cat-label">
                  <div
                    className="menu-cat-label-img"
                    style={{ position: "relative", overflow: "hidden" }}
                  >
                    {resolveImg(activeCat.img) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={resolveImg(activeCat.img)!}
                        alt={activeCat.name}
                        onError={imgOnError}
                        style={imgFill}
                      />
                    ) : (
                      <ImgPlaceholder />
                    )}
                  </div>
                  <CatIcon id={activeCat.id} active={true} />
                  <p className="menu-cat-label-title">
                    {activeCat.name.toUpperCase()}
                    <span className="menu-cat-label-count">
                      {activeCat.items.length} ITEMS
                    </span>
                  </p>
                  {canManageMenu && (
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEditCat(activeCat)}
                        style={{ padding: "0 14px", minHeight: 40, borderRadius: 9, border: "1px solid var(--primary-border)", background: "var(--primary-bg)", color: "var(--primary)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        ✏️ EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteCat(activeCat)}
                        style={{ padding: "0 14px", minHeight: 40, borderRadius: 9, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "#FF4444", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        🗑 DELETE
                      </button>
                    </div>
                  )}
                </div>
                {/* Veg / Non-Veg filter — above items grid */}
                <div className="menu-veg-bar">
                  {(['all', 'veg', 'non_veg'] as const).map(v => (
                    <button
                      key={v}
                      className={'menu-veg-btn' + (vegFilter === v ? ' active' : '')}
                      onClick={() => setVegFilter(v)}
                      style={vegFilter === v ? {
                        background: v === 'non_veg' ? '#EF4444' : v === 'veg' ? '#22C55E' : 'var(--primary)',
                        color: '#fff',
                        borderColor: v === 'non_veg' ? '#EF4444' : v === 'veg' ? '#22C55E' : 'var(--primary)',
                      } : undefined}
                    >
                      {v === 'all' ? ' All' : v === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                    </button>
                  ))}
                </div>

                <div className="menu-items-scroll">
                  <div className="menu-items-grid">
                    {activeCat.items
                      .filter(item => vegFilter === 'all' || item.itemType === vegFilter)
                      .map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onOpenDetail={setDetailItem}
                          {...(canManageMenu ? { onEdit: openEditModal, onDelete: handleDeleteItem } : {})}
                        />
                      ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <OrderPanel />

      {/* ITEM DETAIL POPUP */}
      {detailItem && (
        <ItemDetailPopup
          item={detailItem}
          catName={
            cats.find((c) => c.items.some((i) => i.id === detailItem.id))?.name
          }
          onClose={() => setDetailItem(null)}
          onAdd={handleAdd}
        />
      )}

      {/* ADD ITEM MODAL */}
      {showAddItem && (
        <div
          className="menu-modal-overlay"
          onClick={() => setShowAddItem(false)}
        >
          <div
            className="menu-modal-box anim-scale"
            style={{ width: 460, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="menu-modal-title">ADD MENU ITEM</h3>
            <p className="menu-modal-sub">
              Adding to: <span>{activeCat?.name}</span>
            </p>

            <div className="menu-field">
              <label className="menu-field-label">ITEM IMAGE</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {addItemForm.img && (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={addItemForm.img}
                      alt="preview"
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Image URL (optional)"
                    value={
                      addItemForm.img.startsWith("data:") ? "" : addItemForm.img
                    }
                    onChange={(e) =>
                      setAddItemForm((p) => ({ ...p, img: e.target.value }))
                    }
                    className="menu-field-input"
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px dashed var(--border)",
                      background: "var(--input-bg)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "Syne,sans-serif",
                    }}
                  >
                    📁 {addItemForm.img ? "Change Image" : "Upload Image"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        (v) => setAddItemForm((p) => ({ ...p, img: v })),
                        setAddItemFile,
                      )
                    }
                  />
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-dim)",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8v4M12 16h.01"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Max 2 MB · Auto-compressed to 800px JPEG
                  </p>
                </div>
              </div>
            </div>

            {(
              [
                {
                  label: "Item Name *",
                  key: "name",
                  placeholder: "e.g. Grilled Salmon",
                  type: "text",
                },
                {
                  label: "Base Price (SR) *",
                  key: "price",
                  placeholder: "e.g. 35",
                  type: "number",
                },
                {
                  label: "Description",
                  key: "description",
                  placeholder: "Short description",
                  type: "text",
                },
              ] as {
                label: string;
                key: string;
                placeholder: string;
                type: string;
              }[]
            ).map((f) => (
              <div key={f.key} className="menu-field">
                <label className="menu-field-label">
                  {f.label.toUpperCase()}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(addItemForm as Record<string, string>)[f.key]}
                  onChange={(e) =>
                    setAddItemForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="menu-field-input"
                />
              </div>
            ))}

            <div className="menu-field">
              <label className="menu-field-label">ITEM CODE (OPTIONAL)</label>
              <input
                type="text"
                placeholder="e.g. S001"
                value={addItemForm.code}
                onChange={(e) => setAddItemForm((p) => ({ ...p, code: e.target.value }))}
                className="menu-field-input"
              />
            </div>

            <div className="menu-field">
              <label className="menu-field-label">CATEGORY</label>
              <select
                value={addItemForm.categoryId || activeCat?.id || ""}
                onChange={(e) =>
                  setAddItemForm((p) => ({ ...p, categoryId: e.target.value }))
                }
                className="menu-field-input"
                style={{ background: "var(--input-bg)", color: "var(--text)" }}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Veg / Non-Veg toggle */}
            <div className="menu-field">
              <label className="menu-field-label">ITEM TYPE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["veg", "non_veg"] as const).map((t) => {
                  const active = addItemForm.itemType === t;
                  const color = t === "veg" ? "#22C55E" : "#EF4444";
                  return (
                    <button key={t} type="button"
                      onClick={() => setAddItemForm((p) => ({ ...p, itemType: t }))}
                      style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: "Syne,sans-serif", fontSize: 14, border: `1.5px solid ${active ? color : "var(--border)"}`, background: active ? `${color}18` : "var(--input-bg)", color: active ? color : "var(--text-dim)", transition: "all 0.15s" }}>
                      {t === "veg" ? "🟢 Veg" : "🔴 Non-Veg"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="menu-variants-section">
              <div className="menu-variants-header">
                <label className="menu-field-label" style={{ margin: 0 }}>
                  VARIANTS (Label + Price)
                </label>
                <button
                  className="menu-variants-add"
                  onClick={() =>
                    setAddItemVariants((p) => [...p, { label: "", price: "" }])
                  }
                >
                  + ADD VARIANT
                </button>
              </div>
              {addItemVariants.map((v, idx) => (
                <div key={idx} className="menu-variants-row">
                  <input
                    type="text"
                    placeholder="Label (e.g. Small)"
                    value={v.label}
                    onChange={(e) =>
                      setAddItemVariants((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                    className="menu-field-input"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) =>
                      setAddItemVariants((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, price: e.target.value } : x,
                        ),
                      )
                    }
                    className="menu-field-input"
                  />
                  <button
                    className="menu-variants-remove"
                    onClick={() =>
                      setAddItemVariants((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="menu-modal-actions">
              <button onClick={handleAddItem} className="menu-modal-submit">
                ADD ITEM
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setAddItemVariants([]);
                }}
                className="menu-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editItem && (
        <div className="menu-modal-overlay" onClick={() => setEditItem(null)}>
          <div
            className="menu-modal-box anim-scale"
            style={{ width: 460, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="menu-modal-title">EDIT MENU ITEM</h3>
            <p className="menu-modal-sub">
              Editing: <span>{editItem.name}</span>
            </p>

            <div className="menu-field">
              <label className="menu-field-label">ITEM IMAGE</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {editForm.img && (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editForm.img}
                      alt="preview"
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={editForm.img.startsWith("data:") ? "" : editForm.img}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, img: e.target.value }))
                    }
                    className="menu-field-input"
                  />
                  <button
                    onClick={() => editImageInputRef.current?.click()}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px dashed var(--border)",
                      background: "var(--input-bg)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "Syne,sans-serif",
                    }}
                  >
                    📁 Upload New Image
                  </button>
                  <input
                    ref={editImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        (v) => setEditForm((p) => ({ ...p, img: v })),
                        setEditItemFile,
                      )
                    }
                  />
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-dim)",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8v4M12 16h.01"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Max 2 MB · Auto-compressed to 800px JPEG
                  </p>
                </div>
              </div>
            </div>

            {(
              [
                {
                  label: "Item Name *",
                  key: "name",
                  placeholder: "e.g. Grilled Salmon",
                  type: "text",
                },
                {
                  label: "Base Price (SR) *",
                  key: "price",
                  placeholder: "e.g. 35",
                  type: "number",
                },
                {
                  label: "Description",
                  key: "description",
                  placeholder: "Short description",
                  type: "text",
                },
              ] as {
                label: string;
                key: string;
                placeholder: string;
                type: string;
              }[]
            ).map((f) => (
              <div key={f.key} className="menu-field">
                <label className="menu-field-label">
                  {f.label.toUpperCase()}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(editForm as Record<string, string>)[f.key]}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="menu-field-input"
                />
              </div>
            ))}

            <div className="menu-field">
              <label className="menu-field-label">ITEM CODE (OPTIONAL)</label>
              <input
                type="text"
                placeholder="e.g. S001"
                value={editForm.code}
                onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                className="menu-field-input"
              />
            </div>

            <div className="menu-field">
              <label className="menu-field-label">CATEGORY</label>
              <select
                value={editForm.categoryId}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, categoryId: e.target.value }))
                }
                className="menu-field-input"
                style={{ background: "var(--input-bg)", color: "var(--text)" }}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Veg / Non-Veg toggle — edit modal */}
            <div className="menu-field">
              <label className="menu-field-label">ITEM TYPE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["veg", "non_veg"] as const).map((t) => {
                  const active = editForm.itemType === t;
                  const color = t === "veg" ? "#22C55E" : "#EF4444";
                  return (
                    <button key={t} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, itemType: t }))}
                      style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: "Syne,sans-serif", fontSize: 14, border: `1.5px solid ${active ? color : "var(--border)"}`, background: active ? `${color}18` : "var(--input-bg)", color: active ? color : "var(--text-dim)", transition: "all 0.15s" }}>
                      {t === "veg" ? "🟢 Veg" : "🔴 Non-Veg"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="menu-variants-section">
              <div className="menu-variants-header">
                <label className="menu-field-label" style={{ margin: 0 }}>
                  VARIANTS
                </label>
                <button
                  className="menu-variants-add"
                  onClick={() =>
                    setEditVariants((p) => [...p, { label: "", price: "" }])
                  }
                >
                  + ADD VARIANT
                </button>
              </div>
              {editVariants.map((v, idx) => (
                <div key={idx} className="menu-variants-row">
                  <input
                    type="text"
                    placeholder="Label"
                    value={v.label}
                    onChange={(e) =>
                      setEditVariants((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                    className="menu-field-input"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) =>
                      setEditVariants((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, price: e.target.value } : x,
                        ),
                      )
                    }
                    className="menu-field-input"
                  />
                  <button
                    className="menu-variants-remove"
                    onClick={() =>
                      setEditVariants((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="menu-modal-actions">
              <button onClick={handleEditItem} className="menu-modal-submit">
                SAVE CHANGES
              </button>
              <button
                onClick={() => handleDeleteItem(editItem)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,68,68,0.3)",
                  background: "rgba(255,68,68,0.08)",
                  color: "#FF4444",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Syne,sans-serif",
                }}
              >
                DELETE
              </button>
              <button
                onClick={() => {
                  setEditItem(null);
                  setEditItemFile(null);
                }}
                className="menu-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showAddCat && (
        <div
          className="menu-modal-overlay"
          onClick={() => setShowAddCat(false)}
        >
          <div
            className="menu-modal-box anim-scale"
            style={{ width: 380, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="menu-modal-title">ADD CATEGORY</h3>
            <p className="menu-modal-sub">Create a new menu section</p>

            {/* Category name */}
            <div className="menu-field">
              <label className="menu-field-label">CATEGORY NAME *</label>
              <input
                placeholder="e.g. Seafood"
                value={addCatForm.name}
                onChange={(e) =>
                  setAddCatForm((p) => ({ ...p, name: e.target.value }))
                }
                className="menu-field-input"
              />
            </div>

            {/* Image upload */}
            <div className="menu-field">
              <label className="menu-field-label">CATEGORY IMAGE</label>

              {/* Preview */}
              {(addCatForm.img || addCatFile) && (
                <div
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    marginBottom: 8,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={addCatForm.img}
                    alt="preview"
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => setAddCatForm((p) => ({ ...p, img: "" }))}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={() => catImageInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 9,
                  border: "1.5px dashed var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "Syne,sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  marginBottom: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {addCatForm.img ? "Change Image" : "Upload Image"}
              </button>
              <input
                ref={catImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    (v) => setAddCatForm((p) => ({ ...p, img: v })),
                    setAddCatFile,
                  )
                }
              />

              {/* Size note */}
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-dim)",
                  margin: "4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 8v4M12 16h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Max upload:{" "}
                <strong style={{ color: "var(--text-muted)" }}>2 MB</strong> ·
                Auto-compressed to 800px JPEG · Formats: JPG, PNG, WEBP
              </p>

              {/* Or URL */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: "10px 0 6px",
                }}
              >
                <div
                  style={{ flex: 1, height: 1, background: "var(--border)" }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--text-dim)",
                    fontWeight: 700,
                  }}
                >
                  OR PASTE URL
                </span>
                <div
                  style={{ flex: 1, height: 1, background: "var(--border)" }}
                />
              </div>
              <input
                placeholder="https://images.unsplash.com/…"
                value={addCatForm.img.startsWith("blob:") ? "" : addCatForm.img}
                onChange={(e) =>
                  setAddCatForm((p) => ({ ...p, img: e.target.value }))
                }
                className="menu-field-input"
              />
            </div>

            <div className="menu-modal-actions">
              <button onClick={handleAddCat} className="menu-modal-submit">
                CREATE
              </button>
              <button
                onClick={() => {
                  setShowAddCat(false);
                  setAddCatForm({ name: "", img: "" });
                  setAddCatFile(null);
                }}
                className="menu-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editCat && (
        <div
          className="menu-modal-overlay"
          onClick={() => setEditCat(null)}
        >
          <div
            className="menu-modal-box anim-scale"
            style={{ width: 380, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="menu-modal-title">EDIT CATEGORY</h3>
            <p className="menu-modal-sub">
              Editing: <span>{editCat.name}</span>
            </p>

            <div className="menu-field">
              <label className="menu-field-label">CATEGORY NAME *</label>
              <input
                placeholder="e.g. Seafood"
                value={editCatForm.name}
                onChange={(e) =>
                  setEditCatForm((p) => ({ ...p, name: e.target.value }))
                }
                className="menu-field-input"
              />
            </div>

            <div className="menu-field">
              <label className="menu-field-label">CATEGORY IMAGE</label>

              {editCatForm.img && (
                <div
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    marginBottom: 8,
                    position: "relative",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editCatForm.img}
                    alt="preview"
                    onError={imgOnError}
                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                  />
                  <button
                    onClick={() => { setEditCatForm((p) => ({ ...p, img: "" })); setEditCatFile(null); }}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                onClick={() => editCatImageInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 9,
                  border: "1.5px dashed var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "Syne,sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  marginBottom: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {editCatForm.img ? "Change Image" : "Upload Image"}
              </button>
              <input
                ref={editCatImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    (v) => setEditCatForm((p) => ({ ...p, img: v })),
                    setEditCatFile,
                  )
                }
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: "10px 0 6px",
                }}
              >
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 700 }}>
                  OR PASTE URL
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <input
                placeholder="https://…"
                value={editCatForm.img.startsWith("blob:") ? "" : editCatForm.img}
                onChange={(e) =>
                  setEditCatForm((p) => ({ ...p, img: e.target.value }))
                }
                className="menu-field-input"
              />
            </div>

            <div className="menu-modal-actions">
              <button onClick={handleEditCat} className="menu-modal-submit">
                SAVE CHANGES
              </button>
              <button
                onClick={() => { setEditCat(null); setEditCatFile(null); }}
                className="menu-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
