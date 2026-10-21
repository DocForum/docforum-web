// Thin fetch wrapper for calling docforum-core's API. This is the *only*
// place HTTP details (base URL, headers, error shape, timeouts,
// cancellation and GET de-duplication) live — feature services build on
// top of this, never call fetch() directly.
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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
    /** True when the request was aborted by the caller (e.g. an upload the
     * user cancelled) — distinct from a network error, which also reports
     * status 0. */
    public readonly cancelled = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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

/** PROVISIONAL error envelope assumption: `{ message: string }`. */
interface ErrorEnvelope {
  message?: string;
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

async function parseResponse<T>(response: Response, parse: ParseMode): Promise<T> {
  if (parse === 'blob') {
    if (!response.ok) {
      const payload = await readJsonPayload(response);
      throw new ApiError((payload as ErrorEnvelope | undefined)?.message ?? response.statusText, response.status, payload);
    }
    return (await response.blob()) as T;
  }

  const payload = await readJsonPayload(response);
  if (!response.ok) {
    const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
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
    const response = await fetch(url, { ...init, signal: controller.signal });
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
 * credentials and `{ message }` error envelope as `apiFetch`. */
export function apiUpload<T>(path: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
  const { accessToken, signal, onProgress } = options;

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError('Upload cancelled', 0, undefined, true));
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
      const message = (payload as ErrorEnvelope | undefined)?.message ?? xhr.statusText;
      reject(new ApiError(message, xhr.status, payload));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError('Network error during upload', 0));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError('Upload cancelled', 0, undefined, true));
    };

    xhr.send(formData);
  });
}
