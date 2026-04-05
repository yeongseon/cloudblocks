import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiDelete,
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  getApiErrorMessage,
  isAuthError,
  normalizeApiBaseUrl,
} from './client';

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

  it('throws ApiError with status 0 on fetch network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Network request failed',
      status: 0,
      body: '',
    });
  });

  it('uses FastAPI detail message for ApiError message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Repository not linked' }, 400));

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Repository not linked',
      status: 400,
    });
  });

  it('uses AppError error.message for ApiError message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } }, 404),
    );

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Workspace not found',
      status: 404,
    });
  });

  it('prefers AppError error.message over FastAPI detail', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { detail: 'Fallback detail', error: { code: 'FORBIDDEN', message: 'Access denied' } },
        403,
      ),
    );

    await expect(apiGet('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Access denied',
      status: 403,
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

  it('strips legacy /api suffix from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });

  it('strips legacy /api suffix with trailing slash from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api/');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });

  it('strips /api/v1 suffix from VITE_API_URL without duplicating path', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api/v1');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });

  it('strips /api/v1/ suffix with trailing slash from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api/v1/');
    const { apiGet } = await import('./client');

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiGet('/api/v1/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/test');
  });
});

describe('normalizeApiBaseUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000///')).toBe('http://localhost:8000');
  });

  it('strips /api suffix', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000/api')).toBe('http://localhost:8000');
  });

  it('strips /api/v1 suffix', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000/api/v1')).toBe('http://localhost:8000');
  });

  it('preserves base URL without /api suffix', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000')).toBe('http://localhost:8000');
  });

  it('handles empty string', () => {
    expect(normalizeApiBaseUrl('')).toBe('');
  });
});

describe('getApiErrorMessage', () => {
  it('extracts FastAPI detail from ApiError body', () => {
    const error = new ApiError(
      'API request failed with status 400',
      400,
      '{"detail":"Missing backend workspace ID"}',
    );

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Missing backend workspace ID');
  });

  it('falls back to Error.message for non-ApiError', () => {
    expect(getApiErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down');
  });

  it('falls back to supplied message when thrown value is not Error', () => {
    expect(getApiErrorMessage('bad', 'Fallback')).toBe('Fallback');
  });

  it('falls back to ApiError.message when body has no detail field', () => {
    const error = new ApiError('API request failed with status 400', 400, '{"other":"stuff"}');

    expect(getApiErrorMessage(error, 'Fallback')).toBe('API request failed with status 400');
  });

  it('falls back to ApiError.message when body is empty string', () => {
    const error = new ApiError('API request failed with status 400', 400, '');

    expect(getApiErrorMessage(error, 'Fallback')).toBe('API request failed with status 400');
  });

  it('extracts AppError error.message from ApiError body', () => {
    const error = new ApiError(
      'API request failed with status 404',
      404,
      '{"error":{"code":"NOT_FOUND","message":"Workspace not found"}}',
    );

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Workspace not found');
  });
});

describe('isAuthError', () => {
  it('returns true for ApiError 401', () => {
    expect(isAuthError(new ApiError('Unauthorized', 401, ''))).toBe(true);
  });

  it('returns false for non-401 or non-ApiError', () => {
    expect(isAuthError(new ApiError('Server error', 500, ''))).toBe(false);
    expect(isAuthError(new Error('Unauthorized'))).toBe(false);
  });
});
