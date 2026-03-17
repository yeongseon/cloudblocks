import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiUser } from '../../shared/types/api';

vi.mock('../../shared/api/client', () => ({
  apiGet: vi.fn(),
}));

import { apiGet } from '../../shared/api/client';
import { useAuthStore } from './authStore';

const mockApiGet = vi.mocked(apiGet);

const mockUser: ApiUser = {
  id: 'user-1',
  github_username: 'octocat',
  email: 'octocat@example.com',
  display_name: 'Octo Cat',
  avatar_url: 'https://example.com/avatar.png',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    useAuthStore.setState({
      status: 'unknown',
      user: null,
      hydrated: false,
      error: null,
    });
  });

  it('has expected initial state', () => {
    const state = useAuthStore.getState();

    expect(state.status).toBe('unknown');
    expect(state.user).toBe(null);
    expect(state.hydrated).toBe(false);
    expect(state.error).toBe(null);
  });

  it('setAuthenticated sets authenticated state', () => {
    useAuthStore.getState().setAuthenticated(mockUser);

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBe(null);
  });

  it('setAnonymous sets anonymous state', () => {
    useAuthStore.setState({ status: 'authenticated', user: mockUser, error: 'old' });
    useAuthStore.getState().setAnonymous();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.error).toBe(null);
  });

  it('setError updates error', () => {
    useAuthStore.getState().setError('boom');
    expect(useAuthStore.getState().error).toBe('boom');

    useAuthStore.getState().setError(null);
    expect(useAuthStore.getState().error).toBe(null);
  });

  it('checkSession sets authenticated state on success', async () => {
    mockApiGet.mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/auth/session');
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(mockUser);
    expect(state.hydrated).toBe(true);
    expect(state.error).toBe(null);
  });

  it('checkSession sets anonymous state on 401', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Unauthorized'));

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.hydrated).toBe(true);
  });

  it('checkSession sets anonymous state on network error', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.hydrated).toBe(true);
  });
});
