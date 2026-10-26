// Transport for docforum-core's API — the *only* place base URL, credentials,
// auth headers, timeouts, cancellation, GET de-duplication and the error
// envelope live. Feature services call the typed client from
// `@docforum/api-client` (see packages/api-client/) through the `api` export
// below, or the compatibility `apiFetch*` helpers for routes that are not yet
// in the vendored OpenAPI fixture. Neither feature code nor the generated
// client calls `fetch()` directly.
//
// `credentials: 'include'` is required: the API sets its refresh token as a
// cross-site `SameSite=None; Secure` cookie (GitHub Pages and Render are
// different domains), which `fetch` only sends/stores with this flag.
import { createApiClient, type ApiTransport, type TransportOptions } from '@docforum/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  /** Milliseconds before the request fails with `ApiTimeoutError`.
   * Defaults to `DEFAULT_TIMEOUT_MS`; slow endpoints use
   * `SLOW_REQUEST_TIMEOUT_MS`. `0` disables the timeout (tests only). */
  timeoutMs?: number;
}

/** True when `error` is a caller-initiated cancellation (React Query
 * unmount/navigation abort), not a real failure — nothing to retry, log
 * or show. Timeouts are *not* aborts: they are failures. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof ApiTimeoutError || error instanceof ApiError) return false;
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
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

function buildHeaders(options: RequestOptions, parse: ParseMode, hasForm = false): Record<string, string> {
  const headers: Record<string, string> = parse === 'json' ? { Accept: 'application/json' } : {};
  // A multipart body must keep the browser-generated boundary, so it never
  // sets Content-Type here.
  if (!hasForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
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
    return await runFetch<T>(`${API_BASE_URL}${path}`, init, path, timeoutMs, controller, parse);
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
    created.promise = runFetch<T>(`${API_BASE_URL}${path}`, init, path, timeoutMs, controller, parse).finally(() => {
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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  // Never de-duplicate mutations: replaying a POST's response for a second
  // caller would hide the fact that two writes happened (or didn't).
  return method === 'GET'
    ? executeDeduped<T>(path, options, 'json')
    : executeOnce<T>(path, options, 'json');
}

export interface FormRequestOptions {
  method?: 'POST' | 'PATCH';
  accessToken?: string | null;
  signal?: AbortSignal;
  /** Same budget rules as `RequestOptions.timeoutMs`. */
  timeoutMs?: number;
}

/** Multipart upload. Always a mutation, so it is never de-duplicated, and
 * it rides the same timeout/abort plumbing as every other request. */
export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  options: FormRequestOptions = {},
): Promise<T> {
  const request: RequestOptions = { ...options, method: options.method ?? 'POST' };
  return executeOnce<T>(path, request, 'json', formData);
}

export async function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const method = options.method ?? 'GET';
  return method === 'GET'
    ? executeDeduped<Blob>(path, options, 'blob')
    : executeOnce<Blob>(path, options, 'blob');
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
