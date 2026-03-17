import { create } from 'zustand';
import { apiGet } from '../../shared/api/client';
import type { ApiUser, SessionUserResponse } from '../../shared/types/api';

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: ApiUser | null;
  hydrated: boolean;
  error: string | null;

  setAuthenticated: (user: ApiUser) => void;
  setAnonymous: () => void;
  setError: (error: string | null) => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  hydrated: false,
  error: null,

  setAuthenticated: (user) =>
    set({ status: 'authenticated', user, error: null }),

  setAnonymous: () =>
    set({ status: 'anonymous', user: null, error: null }),

  setError: (error) =>
    set({ error }),

  checkSession: async () => {
    try {
      const user = await apiGet<SessionUserResponse>('/api/v1/auth/session');
      set({ status: 'authenticated', user, hydrated: true, error: null });
    } catch {
      set({ status: 'anonymous', user: null, hydrated: true, error: null });
    }
  },
}));
