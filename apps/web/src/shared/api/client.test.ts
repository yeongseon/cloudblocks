import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiDelete, apiFetch, apiGet, apiPost, apiPut } from './client';

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
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('handles successful POST request and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ created: true }));

    const result = await apiPost<{ created: boolean }>('/api/v1/test', { name: 'repo' });

    expect(result).toEqual({ created: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"name":"repo"}');
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
    expect(requestHeaders(fetchMock.mock.calls[0]).get('Content-Type')).toBe('application/json');
  });

  it('handles successful PUT request and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ updated: true }));

    const result = await apiPut<{ updated: boolean }>('/api/v1/test', { branch: 'main' });

    expect(result).toEqual({ updated: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"branch":"main"}');
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
    expect(requestHeaders(fetchMock.mock.calls[0]).get('Content-Type')).toBe('application/json');
  });

  it('handles successful DELETE request with 204 empty response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiDelete('/api/v1/test')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('does not add Authorization header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiGet<{ ok: boolean }>('/api/v1/test');

    expect(requestHeaders(fetchMock.mock.calls[0]).has('Authorization')).toBe(false);
  });

  it('throws ApiError for 401 and does not retry', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('Unauthorized', 401));

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'API request failed with status 401',
      status: 401,
      body: 'Unauthorized',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError for 500 responses', async () => {
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
    expect(requestInit.credentials).toBe('include');
  });
});

describe('API_BASE_URL normalization', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('strips trailing slash from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });

  it('works correctly when VITE_API_URL has no trailing slash', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });

  it('produces correct URL when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/test');
  });

  it('strips multiple trailing slashes from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000///');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });
});
