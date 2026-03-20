import { create } from 'zustand';
import { apiGet, apiPost } from '../../shared/api/client';
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
  logout: () => Promise<void>;
}

let _checkSessionSeq = 0;

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
    const seq = ++_checkSessionSeq;
    try {
      const user = await apiGet<SessionUserResponse>('/api/v1/auth/session');
      if (seq !== _checkSessionSeq) return; // stale response
      set({ status: 'authenticated', user, hydrated: true, error: null });
    } catch (err: unknown) {
      if (seq !== _checkSessionSeq) return; // stale response
      // Only treat 401 as "anonymous"; other errors keep status unknown
      const isUnauthorized =
        err instanceof Error &&
        'status' in err &&
        (err as { status: number }).status === 401;
      if (isUnauthorized) {
        set({ status: 'anonymous', user: null, hydrated: true, error: null });
      } else {
        set({ hydrated: true, error: 'Session check failed' });
      }
    }
  },

  logout: async () => {
    try {
      await apiPost<{ message: string }>('/api/v1/auth/logout');
      set({ status: 'anonymous', user: null, error: null });
    } catch {
      set({ error: 'Logout failed. Checking session…' });
      await useAuthStore.getState().checkSession();
    }
  },
}));
