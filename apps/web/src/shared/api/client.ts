const RAW_API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const API_V1_SUFFIX = '/api/v1';
const API_SUFFIX = '/api';

export function normalizeApiBaseUrl(rawBaseUrl: string): string {
  const withoutTrailingSlashes = rawBaseUrl.replace(/\/+$/, '');
  if (withoutTrailingSlashes.endsWith(API_V1_SUFFIX)) {
    return withoutTrailingSlashes.slice(0, -API_V1_SUFFIX.length);
  }
  if (withoutTrailingSlashes.endsWith(API_SUFFIX)) {
    return withoutTrailingSlashes.slice(0, -API_SUFFIX.length);
  }
  return withoutTrailingSlashes;
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL?.trim());
}

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

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

interface FastApiErrorEnvelope {
  detail?: string;
}

function parseFastApiDetail(body: string): string | null {
  if (body.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as FastApiErrorEnvelope;
    if (typeof parsed.detail === 'string' && parsed.detail.trim().length > 0) {
      return parsed.detail;
    }
  } catch {
    return null;
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) {
    const detail = parseFastApiDetail(error.body);
    if (detail) {
      return detail;
    }
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
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

async function parseJson<T>(response: Response): Promise<T> {
  const text = await parseResponseBody(response);
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const body = normalizeBody(init?.body, headers);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0, '');
  }

  if (!response.ok) {
    const responseBody = await parseResponseBody(response);
    const detail = parseFastApiDetail(responseBody);
    throw new ApiError(detail ?? `API request failed with status ${response.status}`, response.status, responseBody);
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
