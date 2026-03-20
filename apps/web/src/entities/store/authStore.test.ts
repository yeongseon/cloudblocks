import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiUser } from '../../shared/types/api';

vi.mock('../../shared/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from '../../shared/api/client';
import { useAuthStore } from './authStore';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

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
    mockApiPost.mockReset();
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
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockApiGet.mockRejectedValueOnce(err);

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.hydrated).toBe(true);
    expect(state.error).toBe(null);
  });

  it('checkSession clears auth on network error', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.hydrated).toBe(true);
    expect(state.error).toBe('Session check failed');
  });

  it('checkSession clears stale authenticated state on non-401 error', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
      hydrated: true,
      error: null,
    });

    mockApiGet.mockRejectedValueOnce(new Error('Server error'));

    await useAuthStore.getState().checkSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.error).toBe('Session check failed');
  });

  it('checkSession ignores stale success response when another call follows', async () => {
    // First call resolves slowly, second call resolves immediately
    let resolveFirst!: (v: ApiUser) => void;
    const firstPromise = new Promise<ApiUser>((r) => { resolveFirst = r; });
    mockApiGet.mockReturnValueOnce(firstPromise as ReturnType<typeof apiGet>);
    mockApiGet.mockResolvedValueOnce(mockUser);

    // Fire first call (will be stale)
    const call1 = useAuthStore.getState().checkSession();
    // Fire second call immediately (supersedes first)
    const call2 = useAuthStore.getState().checkSession();

    await call2;

    // Now resolve first — should be ignored (stale)
    resolveFirst(mockUser);
    await call1;

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.hydrated).toBe(true);
  });

  it('checkSession ignores stale error response when another call follows', async () => {
    let rejectFirst!: (e: Error) => void;
    const firstPromise = new Promise<never>((_, r) => { rejectFirst = r; });
    mockApiGet.mockReturnValueOnce(firstPromise as ReturnType<typeof apiGet>);
    mockApiGet.mockResolvedValueOnce(mockUser);

    const call1 = useAuthStore.getState().checkSession();
    const call2 = useAuthStore.getState().checkSession();

    await call2;

    // Now reject first — should be ignored (stale)
    rejectFirst(new Error('Network error'));
    await call1;

    const state = useAuthStore.getState();
    // Should still be authenticated from call2, not error from call1
    expect(state.status).toBe('authenticated');
    expect(state.error).toBe(null);
  });

  it('logout sets anonymous state on success', async () => {
    useAuthStore.setState({ status: 'authenticated', user: mockUser });
    mockApiPost.mockResolvedValueOnce({ message: 'ok' });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(state.status).toBe('anonymous');
    expect(state.user).toBe(null);
    expect(state.error).toBe(null);
  });

  it('logout calls checkSession on failure', async () => {
    useAuthStore.setState({ status: 'authenticated', user: mockUser });
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));
    // checkSession will be called as fallback — mock a successful session check
    mockApiGet.mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/auth/logout');
    // checkSession was called as recovery, which sets authenticated
    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/auth/session');
    expect(state.status).toBe('authenticated');
  });
});
