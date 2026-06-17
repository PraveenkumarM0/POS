import { create } from "zustand";

interface AuthState {
  token: string | null;
  role: string | null;
  user: any;

  setAuth: (
    token: string,
    role: string,
    user: any
  ) => void;

  logout: () => void;
}

export const useAuthStore =
  create<AuthState>((set: (arg0: { token: string | null; role: string | null; user: any; }) => void) => ({
    token: null,
    role: null,
    user: null,

    setAuth: (token: string, role: string, user: any) => {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      set({
        token,
        role,
        user,
      });
    },

    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      set({
        token: null,
        role: null,
        user: null,
      });
    },
  }));