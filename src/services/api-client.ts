// Transport for docforum-core's API — the *only* place base URL, credentials,
// auth headers and the error envelope live. Feature services call the typed
// client from `@docforum/api-client` (see packages/api-client/) through the
// `api` export below, never `fetch()` directly.
//
// `credentials: 'include'` is required: the API sets its refresh token as a
// cross-site `SameSite=None; Secure` cookie (GitHub Pages and Render are
// different domains), which `fetch` only sends/stores with this flag.
import { createApiClient, type ApiTransport } from '@docforum/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Shape of docforum-core's error body (see error-catalogue.ts for codes). */
export interface ApiErrorEnvelope {
  message?: unknown;
  /** Machine-readable code, e.g. `SLOT_TAKEN`. */
  code?: unknown;
  details?: unknown;
  requestId?: unknown;
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

  constructor(
    message: string,
    status: number,
    body?: unknown,
    extra: { code?: string | null; details?: unknown; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = extra.code ?? null;
    this.details = extra.details;
    this.requestId = extra.requestId ?? null;
  }
}

/** Error code used when the request never reached the backend. */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

interface RawRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
}

async function send(path: string, options: RawRequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, accessToken, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // Caller-initiated aborts are control flow, not failures — let React Query
    // treat them normally.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      undefined,
      { code: NETWORK_ERROR_CODE },
    );
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!isJson) return undefined;
  return response.json().catch(() => undefined);
}

async function throwForResponse(response: Response): Promise<never> {
  const payload = await readPayload(response);
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

const transport: ApiTransport = {
  async request<T>(path: string, options: RawRequestOptions = {}): Promise<T> {
    const response = await send(path, options);
    if (!response.ok) await throwForResponse(response);
    if (response.status === 204) return undefined as T;
    const payload = await readPayload(response);
    return payload as T;
  },

  async requestBlob(path: string, options: RawRequestOptions = {}): Promise<Blob> {
    const response = await send(path, options);
    if (!response.ok) await throwForResponse(response);
    return response.blob();
  },
};

/** Typed client for every docforum-core endpoint this app uses. */
export const api = createApiClient(transport);

/**
 * Compatibility transport for backend routes that have not been published in
 * the generated OpenAPI fixture yet. It still uses the same transport, so
 * base URL, credentials, auth headers, response parsing, and typed errors
 * remain centralized here. Once a route is added to the spec, its service
 * should move to the corresponding generated `api` method.
 */
export function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    accessToken?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  return transport.request<T>(path, options);
}
