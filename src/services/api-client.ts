// Transport for docforum-core's API — the *only* place base URL, credentials,
// auth headers, retry policy, timeouts, cancellation, GET de-duplication and
// the error envelope live. Feature services call the typed client from
// `@docforum/api-client` (see packages/api-client/) through the `api` export
// below, or the compatibility `apiFetch*` helpers for routes that are not yet
// in the vendored OpenAPI fixture. Neither feature code nor the generated
// client calls `fetch()` directly.
//
// `credentials: 'include'` is required: the API sets its refresh token as a
// cross-site `SameSite=None; Secure` cookie (GitHub Pages and Render are
// different domains), which `fetch` only sends/stores with this flag.
import { createApiClient, type ApiTransport, type TransportOptions } from '@docforum/api-client';
import { useAuthStore } from '../store/auth-store';
import { readCsrfToken } from './csrf-storage';
import type { AuthSession } from './auth-service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

/** Absolute URL for a path on docforum-core. Exported for the one client API
 * that cannot go through `fetch`: `EventSource` (notification stream, #107)
 * needs a full URL and cannot send an Authorization header. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** The configured base URL, for callers that build an absolute URL themselves. */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Default per-request timeout. Deliberately longer than docforum-core's
 * free-tier Render cold start (~1 minute, see
 * docs/adr/0003-render-preview-deployment.md): the slow-request hint
 * (`useSlowRequestHint`, 4s) explains that wait to the user, and a
 * timeout that fired *during* a legitimate cold start would turn a slow
 * success into a fake failure. Requests that genuinely can take longer
 * (data export, job run) pass `timeoutMs` explicitly.
 */
export const DEFAULT_TIMEOUT_MS = 60_000;

/** Timeout for the endpoints known to be slow: server-side data export
 * creation/download and the synchronous admin job runner. */
export const SLOW_REQUEST_TIMEOUT_MS = 120_000;

/** Shape of docforum-core's error body (see error-catalogue.ts for codes). */
export interface ApiErrorEnvelope {
  message?: unknown;
  /** Machine-readable code, e.g. `SLOT_TAKEN`. */
  code?: unknown;
  details?: unknown;
  requestId?: unknown;
  error?: unknown; // nested error envelope from some endpoints
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Typed API failure.
 *
 * `message` is the server's raw text and is kept for logging/debugging only —
 * never render it directly. Use `describeError` from `error-catalogue.ts`
 * (or the `useErrorText` hook) so users get a curated message.
 */
export class ApiError extends Error {
  readonly code: string | null;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly body?: unknown;
  /** True when the request was aborted by the caller (e.g. an upload the
   * user cancelled) — distinct from a network error, which also reports
   * status 0. */
  readonly cancelled: boolean;

  constructor(
    message: string,
    status: number,
    body?: unknown,
    extra: {
      code?: string | null;
      details?: unknown;
      requestId?: string | null;
      cancelled?: boolean;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = extra.code ?? null;
    this.details = extra.details;
    this.requestId = extra.requestId ?? null;
    this.cancelled = extra.cancelled ?? false;
  }
}

/** Error code used when the request never reached the backend. */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

/** A request that exceeded its timeout budget. Distinct from `ApiError`
 * (a response arrived) and from an `AbortError` (the caller went away —
 * e.g. React Query cancelled on unmount — which is never an error to
 * surface to the user). */
export class ApiTimeoutError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'ApiTimeoutError';
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
  /** Sent only on the cookie-authenticated routes (`/auth/refresh`,
   * `/auth/logout`). */
  csrfToken?: string | null;
  signal?: AbortSignal;
  /**
   * Stable key for one logical mutation attempt. Preset on POST/PATCH/DELETE
   * requests that are safe to retry: the same key is sent on every retry so
   * docforum-core can deduplicate (docforum-core#48).
   */
  idempotencyKey?: string;
  /** `false` disables retries entirely. */
  retry?: RetryOptions | false;
  /** Milliseconds before the request fails with `ApiTimeoutError`.
   * Defaults to `DEFAULT_TIMEOUT_MS`; slow endpoints use
   * `SLOW_REQUEST_TIMEOUT_MS`. `0` disables the timeout (tests only). */
  timeoutMs?: number;
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

/** True when `error` is a caller-initiated cancellation (React Query
 * unmount/navigation abort), not a real failure — nothing to retry, log
 * or show. Timeouts are *not* aborts: they are failures. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof ApiTimeoutError || error instanceof ApiError) return false;
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/** Network failures and retryable HTTP statuses. 4xx is never retried. */
export function isRetryableError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  // Transport failures are wrapped as `NETWORK_ERROR` ApiErrors (see
  // `fetchResponse`), so treat that code like a bare fetch TypeError.
  if (error instanceof ApiError) {
    return error.code === NETWORK_ERROR_CODE || isRetryableStatus(error.status);
  }
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

async function withRetry<T>(
  options: RequestOptions,
  method: string,
  run: () => Promise<T>,
  controller?: AbortController,
): Promise<T> {
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
        options.signal?.aborted !== true &&
        controller?.signal.aborted !== true;
      if (!canRetry) throw error;
      await sleep(
        computeBackoffMs(attempt, retry.baseDelayMs ?? DEFAULT_BASE_DELAY_MS, retry.maxDelayMs ?? DEFAULT_MAX_DELAY_MS),
      );
    }
  }
  throw lastError;
}

type ParseMode = 'json' | 'blob';

interface InflightEntry {
  controller: AbortController;
  /** Callers still waiting on this shared GET. When it reaches 0 the
   * shared request is aborted — nobody is waiting for it any more. */
  refs: number;
  promise: Promise<unknown>;
}

/** Identical concurrent GETs share one network request. Keyed by
 * everything that can change the response: URL, bearer token, parse mode
 * and timeout. Mutations never reach this map (see `apiFetch`). */
const inflight = new Map<string, InflightEntry>();

/** Shared single-flight refresh. Resolves to the new access token, or null
 * when the session could not be restored. Never rejects: callers only need
 * to know whether to retry. */
let refreshInFlight: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<string | null> {
  const csrfToken = useAuthStore.getState().csrfToken ?? readCsrfToken();
  try {
    // Cookie-only body (the refresh token is httpOnly); the CSRF token is
    // echoed in the header per docforum-core's Phase 8 contract.
    const session = await executeOnce<AuthSession>('/auth/refresh', { method: 'POST', csrfToken }, 'json');
    useAuthStore.getState().setSession(session.user, session.accessToken, session.csrfToken);
    return session.accessToken;
  } catch (error) {
    // A rejected refresh (expired/revoked cookie, or a rejected CSRF token)
    // means the session is genuinely gone. A network error might just be a
    // Render cold start, so keep the local session and let the caller see
    // the original 401; the next protected call will try again.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      useAuthStore.getState().clearSession();
    }
    return null;
  }
}

/**
 * Run one request, and on a `401` refresh the session once and replay it
 * with the new access token. The replay is a fresh request (new de-dup key,
 * because the token is part of it), so it never reuses a failed response.
 * The original `401` is rethrown when the session cannot be restored.
 */
async function withAuthRetry<T>(
  options: RequestOptions,
  run: (options: RequestOptions) => Promise<T>,
): Promise<T> {
  try {
    return await run(options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !options.accessToken) throw error;
    const refreshedToken = await refreshSession();
    if (!refreshedToken) throw error;
    return run({ ...options, accessToken: refreshedToken });
  }
}

function buildHeaders(options: RequestOptions, parse: ParseMode, hasForm = false): Record<string, string> {
  const headers: Record<string, string> = parse === 'json' ? { Accept: 'application/json' } : {};
  // A multipart body must keep the browser-generated boundary, so it never
  // sets Content-Type here.
  if (!hasForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.csrfToken) headers['X-CSRF-Token'] = options.csrfToken;
  if (options.idempotencyKey) headers[IDEMPOTENCY_HEADER] = options.idempotencyKey;
  return headers;
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  return isJson ? await response.json().catch(() => undefined) : undefined;
}

/**
 * Wrap `fetch` so every non-abort transport failure surfaces as an `ApiError`
 * with `NETWORK_ERROR_CODE` — the error catalogue's "we could not reach
 * DocForum" copy depends on it.
 */
async function fetchResponse(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    // Caller aborts (and timeout aborts) are control flow, not network
    // failures — they must keep their own identity.
    if (isAbortError(error) || error instanceof ApiTimeoutError || error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      undefined,
      { code: NETWORK_ERROR_CODE },
    );
  }
}

async function throwForResponse(response: Response): Promise<never> {
  const payload = await readJsonPayload(response);
  const envelope = (payload ?? {}) as ApiErrorEnvelope;
  const headerRequestId = response.headers.get('x-request-id');
  // Legacy envelope: `{ message }`. Newer envelope adds `code`, `details`,
  // `requestId`; some backends nest it under `error`. Accept all three so a
  // partially-rolled-out backend still surfaces a usable code.
  const nested = (envelope as { error?: ApiErrorEnvelope }).error;
  const source = nested && typeof nested === 'object' ? nested : envelope;

  throw new ApiError(
    asString(source.message) ?? response.statusText,
    response.status,
    payload,
    {
      code: asString(source.code),
      details: source.details,
      requestId: asString(source.requestId) ?? asString(headerRequestId),
    },
  );
}

async function parseResponse<T>(response: Response, parse: ParseMode): Promise<T> {
  if (!response.ok) await throwForResponse(response);
  if (parse === 'blob') return (await response.blob()) as T;
  if (response.status === 204) return undefined as T;
  return (await readJsonPayload(response)) as T;
}

export interface StreamRequestOptions {
  accessToken?: string | null;
  /** Sent as `Last-Event-ID` so docforum-core replays missed events. */
  lastEventId?: string | null;
  signal?: AbortSignal;
}

/**
 * Opens a streaming response (`text/event-stream`). Unlike `apiFetch` this
 * leaves the body unread for an incremental parser. `EventSource` can't
 * send an Authorization header, so the shared SSE manager uses this
 * fetch-based path instead (issue #109).
 */
export async function apiFetchStream(
  path: string,
  options: StreamRequestOptions = {},
): Promise<Response> {
  const { accessToken, lastEventId, signal } = options;
  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (lastEventId) headers['Last-Event-ID'] = lastEventId;

  const response = await fetchResponse(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
    signal,
  });

  if (!response.ok) await throwForResponse(response);
  return response;
}

/**
 * One network attempt: `fetch` + timeout against a single controller.
 * - timeout fires → controller aborted with an `ApiTimeoutError`, which is
 *   what the caller sees;
 * - someone else aborts the controller (caller signal, or every caller of
 *   a de-duped GET walking away) → the caller sees that abort reason.
 */
async function runFetch<T>(
  url: string,
  init: RequestInit,
  path: string,
  timeoutMs: number,
  controller: AbortController,
  parse: ParseMode,
): Promise<T> {
  const work = (async () => {
    const response = await fetchResponse(url, { ...init, signal: controller.signal });
    return await parseResponse<T>(response, parse);
  })();
  // The race below may be won by the timeout; `work` then rejects later
  // (the abort propagates through fetch). Keep it handled so that never
  // becomes an unhandled rejection.
  work.catch(() => {});

  if (!(timeoutMs > 0)) return work;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new ApiTimeoutError(
        `Request timed out after ${timeoutMs}ms: ${path}`,
        path,
        timeoutMs,
      );
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function linkSignal(signal: AbortSignal | undefined, controller: AbortController): () => void {
  if (!signal) return () => {};
  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', onAbort);
  return () => signal.removeEventListener('abort', onAbort);
}

/** Non-de-duplicated request: mutations and anything not safe to share. */
async function executeOnce<T>(
  path: string,
  options: RequestOptions,
  parse: ParseMode,
  formData?: FormData,
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (signal?.aborted) throw signal.reason;

  const controller = new AbortController();
  const unlink = linkSignal(signal, controller);
  try {
    const init: RequestInit = {
      method,
      headers: buildHeaders(options, parse, formData !== undefined),
      credentials: 'include',
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    };
    return await withRetry(
      options,
      method,
      () => runFetch<T>(`${API_BASE_URL}${path}`, init, path, timeoutMs, controller, parse),
      controller,
    );
  } finally {
    unlink();
  }
}

function inflightKey(path: string, options: RequestOptions, parse: ParseMode): string {
  return [
    parse,
    `${API_BASE_URL}${path}`,
    options.accessToken ?? '',
    String(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ].join('\n');
}

/** GET de-duplication: concurrent identical GETs share one request and
 * one parsed result. Callers keep independent cancellation — aborting one
 * caller never fails the others; the shared request is only aborted when
 * its last caller goes away. */
async function executeDeduped<T>(path: string, options: RequestOptions, parse: ParseMode): Promise<T> {
  const { signal } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (signal?.aborted) throw signal.reason;

  const key = inflightKey(path, options, parse);
  let entry = inflight.get(key);

  if (!entry) {
    const controller = new AbortController();
    const init: RequestInit = {
      method: 'GET',
      headers: buildHeaders(options, parse),
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    };
    const created: InflightEntry = { controller, refs: 0, promise: Promise.resolve() };
    created.promise = withRetry(
      options,
      'GET',
      () => runFetch<T>(`${API_BASE_URL}${path}`, init, path, timeoutMs, controller, parse),
      controller,
    ).finally(() => {
      if (inflight.get(key) === created) inflight.delete(key);
    });
    inflight.set(key, created);
    entry = created;
  }

  const current = entry;
  current.refs += 1;

  if (!signal) return (await current.promise) as T;

  let rejectExternal: (reason: unknown) => void;
  const cancelled = new Promise<never>((_, reject) => {
    rejectExternal = reject;
  });
  const onAbort = () => {
    current.refs -= 1;
    if (current.refs <= 0 && inflight.get(key) === current) {
      inflight.delete(key);
      current.controller.abort(signal!.reason);
    }
    rejectExternal(signal!.reason);
  };
  signal.addEventListener('abort', onAbort);
  try {
    return await Promise.race([current.promise as Promise<T>, cancelled]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  // Never de-duplicate mutations: replaying a POST's response for a second
  // caller would hide the fact that two writes happened (or didn't).
  return withAuthRetry(options, (attemptOptions) =>
    method === 'GET'
      ? executeDeduped<T>(path, attemptOptions, 'json')
      : executeOnce<T>(path, attemptOptions, 'json'),
  );
}

export interface FormRequestOptions {
  method?: 'POST' | 'PATCH';
  accessToken?: string | null;
  /** Same CSRF rules as `RequestOptions.csrfToken`. */
  csrfToken?: string | null;
  signal?: AbortSignal;
  /** Same budget rules as `RequestOptions.timeoutMs`. */
  timeoutMs?: number;
  idempotencyKey?: string;
  retry?: RetryOptions | false;
}

/** Multipart upload. Always a mutation, so it is never de-duplicated, and
 * it rides the same timeout/abort plumbing as every other request. */
export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  options: FormRequestOptions = {},
): Promise<T> {
  const request: RequestOptions = { ...options, method: options.method ?? 'POST' };
  return withAuthRetry(request, (attemptOptions) => executeOnce<T>(path, attemptOptions, 'json', formData));
}

export function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const method = options.method ?? 'GET';
  return withAuthRetry(options, (attemptOptions) =>
    method === 'GET'
      ? executeDeduped<Blob>(path, attemptOptions, 'blob')
      : executeOnce<Blob>(path, attemptOptions, 'blob'),
  );
}

export interface UploadOptions {
  accessToken?: string | null;
  signal?: AbortSignal;
  /** 0–100. Fired as the browser reports upload progress. */
  onProgress?: (percent: number) => void;
}

/** Multipart upload with real progress + cancellation. `fetch()` can't
 * report upload progress, so this is the one deliberate exception to the
 * fetch-only rule above — XMLHttpRequest, still confined here so feature
 * code never touches HTTP details directly. Same base URL, auth header,
 * credentials and error envelope as `apiFetch`. */
export function apiUpload<T>(path: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
  const { accessToken, signal, onProgress } = options;

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError('Upload cancelled', 0, undefined, { cancelled: true }));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    const handleAbort = () => xhr.abort();
    signal?.addEventListener('abort', handleAbort);
    const cleanup = () => signal?.removeEventListener('abort', handleAbort);

    xhr.onload = () => {
      cleanup();
      const isJson = xhr.getResponseHeader('content-type')?.includes('application/json');
      let payload: unknown;
      if (isJson) {
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = undefined;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      const envelope = (payload ?? {}) as ApiErrorEnvelope;
      const source = (envelope.error && typeof envelope.error === 'object')
        ? (envelope.error as ApiErrorEnvelope)
        : envelope;
      reject(new ApiError(
        asString(source.message) ?? xhr.statusText,
        xhr.status,
        payload,
        {
          code: asString(source.code),
          details: source.details,
          requestId: asString(source.requestId) ?? xhr.getResponseHeader('x-request-id'),
        },
      ));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError('Network error during upload', 0, undefined, { code: NETWORK_ERROR_CODE }));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError('Upload cancelled', 0, undefined, { cancelled: true }));
    };

    xhr.send(formData);
  });
}

const transport: ApiTransport = {
  request<T>(path: string, options: TransportOptions = {}) {
    const request: RequestOptions = {
      method: options.method ?? 'GET',
      body: options.body,
      accessToken: options.accessToken,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      idempotencyKey: options.idempotencyKey,
    };
    return apiFetch<T>(path, request);
  },
  requestBlob(path: string, options: TransportOptions = {}) {
    return apiFetchBlob(path, {
      method: options.method ?? 'GET',
      body: options.body,
      accessToken: options.accessToken,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  },
};

/** Typed client for every docforum-core endpoint this app uses. */
export const api = createApiClient(transport);
