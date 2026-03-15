import { beforeEach, describe, expect, it } from 'vitest';
import type { ApiUser } from '../../shared/types/api';
import { useAuthStore } from './authStore';

const mockUser: ApiUser = {
  id: 'user-1',
  github_username: 'octocat',
  email: 'octocat@example.com',
  display_name: 'Octo Cat',
  avatar_url: 'https://example.com/avatar.png',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('has expected initial state', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBe(null);
    expect(state.accessToken).toBe(null);
    expect(state.refreshToken).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('login sets user, tokens, and isAuthenticated', () => {
    useAuthStore.getState().login('access-token', 'refresh-token', mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBe(null);
  });

  it('logout clears auth state', () => {
    useAuthStore.getState().login('access-token', 'refresh-token', mockUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBe(null);
    expect(state.accessToken).toBe(null);
    expect(state.refreshToken).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe(null);
  });

  it('setAccessToken updates only access token', () => {
    useAuthStore.getState().login('access-token', 'refresh-token', mockUser);
    useAuthStore.getState().setAccessToken('next-access-token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('next-access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('setLoading updates isLoading', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('setError updates error', () => {
    useAuthStore.getState().setError('boom');
    expect(useAuthStore.getState().error).toBe('boom');

    useAuthStore.getState().setError(null);
    expect(useAuthStore.getState().error).toBe(null);
  });
});
