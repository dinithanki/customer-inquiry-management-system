"use client";

import axios from "axios";
import { create } from "zustand";
import { api } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type AuthStore = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
  setInitialized: (initialized: boolean) => void;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false, isInitialized: false }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      const { data } = await api.get<{ success: boolean; data: { user: AuthUser } }>("/auth/me");
      set({ user: data.data.user, isAuthenticated: true, isInitialized: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({ user: null, isAuthenticated: false, isInitialized: true });
        return;
      }
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
