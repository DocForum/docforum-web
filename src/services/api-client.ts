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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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
    const message = (payload as ErrorEnvelope | undefined)?.message ?? response.statusText;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
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
