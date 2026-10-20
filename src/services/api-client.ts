// Thin fetch wrapper for calling docforum-core's API. This is the *only*
// place HTTP details (base URL, headers, error shape) live — feature
// services build on top of this, never call fetch() directly.
//
// docforum-core's Phase 1 is real now (see its docs/api/README.md) — the
// request/response envelope and error shape below match its actual
// contract, confirmed 2026-09-14 when this repo's Pages preview was
// connected to a live Render deployment (docforum-core's
// docs/adr/0003-render-preview-deployment.md). `credentials: 'include'` is
// required: the API sets its refresh token as a cross-site
// `SameSite=None; Secure` cookie (real cross-site, not just cross-port —
// GitHub Pages and Render are different domains), which `fetch` only
// sends/stores with this flag.

import { notifyRateLimit } from '../store/rate-limit-store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

/** Fallback when a 429 arrives without a usable `Retry-After` header. */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A `429 Too Many Requests` from docforum-core, carrying the wait the server
 * asked for. Every surface derives its countdown from `retryAfterSeconds` so
 * nothing retries sooner than `Retry-After` allows.
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    body?: unknown,
  ) {
    super(message, 429, body);
    this.name = 'RateLimitError';
  }

  get retryAfterMs(): number {
    return this.retryAfterSeconds * 1000;
  }
}

/**
 * Parse a `Retry-After` header (delta-seconds or an HTTP date) into whole
 * seconds. Returns `null` when the header is absent or unusable, so callers
 * can fall back to `DEFAULT_RETRY_AFTER_SECONDS`.
 */
export function parseRetryAfter(header: string | null, now: number = Date.now()): number | null {
  if (!header) return null;
  const value = header.trim();
  if (value === '') return null;

  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

function rateLimitError(response: Response, payload: unknown): RateLimitError {
  const seconds = parseRetryAfter(response.headers.get('Retry-After')) ?? DEFAULT_RETRY_AFTER_SECONDS;
  const message =
    (payload as ErrorEnvelope | undefined)?.message ?? 'Too many requests. Please try again shortly.';
  // One global, non-blocking notice regardless of which caller hit the limit.
  notifyRateLimit(seconds);
  return new RateLimitError(message, seconds, payload);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
}

/** PROVISIONAL error envelope assumption: `{ message: string }`. */
interface ErrorEnvelope {
  message?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    if (response.status === 429) throw rateLimitError(response, payload);
    const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { method = 'GET', body, accessToken, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json().catch(() => undefined) : undefined;
    if (response.status === 429) throw rateLimitError(response, payload);
    const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
    throw new ApiError(message, response.status, payload);
  }

  return response.blob();
}

