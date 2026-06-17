import axios from "axios";

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ;

/** Prepend backend origin to relative image paths stored in the DB. */
export const getImageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
};

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Let the browser set Content-Type (with boundary) for FormData — never force it manually
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

export default api;