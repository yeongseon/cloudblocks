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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  if (!response.ok) {
    const responseBody = await parseResponseBody(response);
    throw new ApiError(`API request failed with status ${response.status}`, response.status, responseBody);
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
