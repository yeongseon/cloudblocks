import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiUser } from '../types/api';
import { useAuthStore } from '../../entities/store/authStore';
import { ApiError, apiDelete, apiFetch, apiGet, apiPost, apiPut } from './client';

const mockUser: ApiUser = {
  id: 'user-1',
  github_username: 'octocat',
  email: 'octocat@example.com',
  display_name: 'Octo Cat',
  avatar_url: 'https://example.com/avatar.png',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

function requestHeaders(callArgs: unknown[]): Headers {
  const init = callArgs[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

describe('api client', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();

    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles successful GET request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiGet<{ ok: boolean }>('/api/v1/test');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/test');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET');
  });

  it('handles successful POST request and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ created: true }));

    const result = await apiPost<{ created: boolean }>('/api/v1/test', { name: 'repo' });

    expect(result).toEqual({ created: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"name":"repo"}');
    expect(requestHeaders(fetchMock.mock.calls[0]).get('Content-Type')).toBe('application/json');
  });

  it('handles successful PUT request and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ updated: true }));

    const result = await apiPut<{ updated: boolean }>('/api/v1/test', { branch: 'main' });

    expect(result).toEqual({ updated: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"branch":"main"}');
    expect(requestHeaders(fetchMock.mock.calls[0]).get('Content-Type')).toBe('application/json');
  });

  it('handles successful DELETE request', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiDelete('/api/v1/test')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });

  it('adds Authorization header when token is present', async () => {
    useAuthStore.getState().login('access-token', 'refresh-token', mockUser);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiGet<{ ok: boolean }>('/api/v1/test');

    expect(requestHeaders(fetchMock.mock.calls[0]).get('Authorization')).toBe('Bearer access-token');
  });

  it('does not add Authorization header when token is missing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiGet<{ ok: boolean }>('/api/v1/test');

    expect(requestHeaders(fetchMock.mock.calls[0]).has('Authorization')).toBe(false);
  });

  it('refreshes token after 401 and retries original request', async () => {
    useAuthStore.getState().login('stale-token', 'refresh-token', mockUser);

    fetchMock
      .mockResolvedValueOnce(textResponse('Unauthorized', 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh-token', token_type: 'bearer' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiGet<{ ok: boolean }>('/api/v1/test');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/test');
    expect(requestHeaders(fetchMock.mock.calls[0]).get('Authorization')).toBe('Bearer stale-token');

    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe('{"refresh_token":"refresh-token"}');

    expect(fetchMock.mock.calls[2][0]).toBe('/api/v1/test');
    expect(requestHeaders(fetchMock.mock.calls[2]).get('Authorization')).toBe('Bearer fresh-token');
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('logs out when refresh fails after 401', async () => {
    useAuthStore.getState().login('stale-token', 'refresh-token', mockUser);

    fetchMock
      .mockResolvedValueOnce(textResponse('Unauthorized', 401))
      .mockResolvedValueOnce(textResponse('Bad refresh token', 401));

    await expect(apiFetch<{ ok: boolean }>('/api/v1/test')).rejects.toBeInstanceOf(ApiError);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(null);
    expect(state.refreshToken).toBe(null);
    expect(state.user).toBe(null);
    expect(state.isAuthenticated).toBe(false);
  });

  it('throws ApiError for non-2xx non-401 responses', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('Server exploded', 500));

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'API request failed with status 500',
      status: 500,
      body: 'Server exploded',
    });
  });

  it('ApiError includes expected name, message, status, and body', () => {
    const error = new ApiError('Custom error', 418, 'Teapot');

    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Custom error');
    expect(error.status).toBe(418);
    expect(error.body).toBe('Teapot');
  });

  it('throws ApiError when 401 and no refresh token available', async () => {
    useAuthStore.getState().login('stale-token', '', mockUser);
    // Set refreshToken to null explicitly
    useAuthStore.setState({ refreshToken: null });

    fetchMock.mockResolvedValueOnce(textResponse('Unauthorized', 401));

    await expect(apiFetch<{ ok: boolean }>('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'No refresh token available',
      status: 401,
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('passes body through when already a string', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/api/v1/test', {
      method: 'POST',
      body: '{"already":"stringified"}',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit.body).toBe('{"already":"stringified"}');
  });
});
