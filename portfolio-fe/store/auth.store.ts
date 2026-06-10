"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Auth store — persists JWT in localStorage (Req 23.2, Property 26).
 * Cleared on logout (Req 23.7, Property 26).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: "portfolio-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
