// Thin fetch wrapper for calling docforum-core's API. This is the *only*
// place HTTP details (base URL, headers, retry policy, error shape) live —
// feature services build on top of this, never call fetch() directly.
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/** Retry tuning for a single request. Inject `sleep` in tests. */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  /**
   * Stable key for one logical mutation attempt. Preset on POST/PATCH/DELETE
   * requests that are safe to retry: the same key is sent on every retry so
   * docforum-core can deduplicate (docforum-core#48).
   */
  idempotencyKey?: string;
  /** `false` disables retries entirely. */
  retry?: RetryOptions | false;
}

const DEFAULT_READ_ATTEMPTS = 3;
/** Retried only when the caller supplied an Idempotency-Key. */
const DEFAULT_IDEMPOTENT_MUTATION_ATTEMPTS = 2;
const DEFAULT_BASE_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 4_000;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  // Non-secure-context fallback (crypto.randomUUID needs a secure context
  // in some browsers). Still unique enough per attempt, and never reused
  // across attempts because the caller creates it once.
  return `df-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/** Network failures and retryable HTTP statuses. 4xx is never retried. */
export function isRetryableError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (error instanceof ApiError) return isRetryableStatus(error.status);
  // fetch() rejects with TypeError on network failure (offline, DNS, CORS).
  return error instanceof TypeError;
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Exponential backoff with jitter, capped at `maxDelayMs`. */
export function computeBackoffMs(
  attempt: number,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exponential * (0.5 + random() * 0.5));
}

function resolveMaxAttempts(options: RequestOptions, method: string): number {
  if (options.retry === false) return 1;
  if (options.retry?.maxAttempts !== undefined) return Math.max(1, options.retry.maxAttempts);
  if (method === 'GET') return DEFAULT_READ_ATTEMPTS;
  // Hard rule: a mutation without an Idempotency-Key is never retried
  // automatically — a flaky connection must not become a double booking.
  return options.idempotencyKey ? DEFAULT_IDEMPOTENT_MUTATION_ATTEMPTS : 1;
}

async function withRetry<T>(options: RequestOptions, method: string, run: () => Promise<T>): Promise<T> {
  const maxAttempts = resolveMaxAttempts(options, method);
  const retry = options.retry === false ? {} : (options.retry ?? {});
  const sleep = retry.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < maxAttempts &&
        isRetryableError(error) &&
        !isOffline() &&
        options.signal?.aborted !== true;
      if (!canRetry) throw error;
      await sleep(
        computeBackoffMs(attempt, retry.baseDelayMs ?? DEFAULT_BASE_DELAY_MS, retry.maxDelayMs ?? DEFAULT_MAX_DELAY_MS),
      );
    }
  }
  throw lastError;
}

function buildHeaders(options: RequestOptions, includeAccept: boolean): Record<string, string> {
  const headers: Record<string, string> = includeAccept ? { Accept: 'application/json' } : {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.idempotencyKey) headers[IDEMPOTENCY_HEADER] = options.idempotencyKey;
  return headers;
}

/** PROVISIONAL error envelope assumption: `{ message: string }`. */
interface ErrorEnvelope {
  message?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  return withRetry(options, method, async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(options, true),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json().catch(() => undefined) : undefined;

    if (!response.ok) {
      const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  });
}

export async function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { method = 'GET', body, signal } = options;

  return withRetry(options, method, async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(options, false),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const payload = isJson ? await response.json().catch(() => undefined) : undefined;
      const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
      throw new ApiError(message, response.status, payload);
    }

    return response.blob();
  });
}
