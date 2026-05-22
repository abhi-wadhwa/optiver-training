'use client';

import { create } from 'zustand';

interface AuthState {
  user: string | null;
  loading: boolean;
  setUser: (user: string | null) => void;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Login failed';
    set({ user: data.user });
    return null;
  },

  logout: async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    set({ user: null });
  },
}));
