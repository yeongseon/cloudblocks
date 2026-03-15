import { useAuthStore } from '../../entities/store/authStore';
import type { RefreshResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildHeaders(init?: RequestInit, token?: string | null): Headers {
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

function normalizeBody(body: BodyInit | null | undefined, headers: Headers): BodyInit | null | undefined {
  if (body === undefined || body === null) {
    return body;
  }

  const contentType = headers.get('Content-Type');
  if (contentType === 'application/json' && typeof body !== 'string') {
    return JSON.stringify(body);
  }

  return body;
}

async function parseResponseBody(response: Response): Promise<string> {
  return response.text();
}

async function requestWithToken(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = buildHeaders(init, token);
  const body = normalizeBody(init?.body, headers);

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status, body);
  }

  const payload = JSON.parse(body) as RefreshResponse;
  return payload.access_token;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await parseResponseBody(response);
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authState = useAuthStore.getState();
  let response = await requestWithToken(path, init, authState.accessToken);

  if (response.status === 401) {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        throw new ApiError('No refresh token available', 401, 'Unauthorized');
      }

      const newAccessToken = await refreshAccessToken(refreshToken);
      useAuthStore.getState().setAccessToken(newAccessToken);
      response = await requestWithToken(path, init, newAccessToken);
    } catch (error) {
      useAuthStore.getState().logout();
      throw error;
    }
  }

  if (!response.ok) {
    const body = await parseResponseBody(response);
    throw new ApiError(`API request failed with status ${response.status}`, response.status, body);
  }

  return parseJson<T>(response);
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: body as BodyInit | null | undefined });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: body as BodyInit | null | undefined });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch<unknown>(path, { method: 'DELETE' });
}
