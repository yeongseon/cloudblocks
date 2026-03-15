import { create } from 'zustand';
import type { ApiUser } from '../../shared/types/api';

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (accessToken: string, refreshToken: string, user: ApiUser) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: (accessToken, refreshToken, user) =>
    set({ accessToken, refreshToken, user, isAuthenticated: true, error: null }),

  logout: () =>
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, error: null }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),
}));
