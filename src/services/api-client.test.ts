import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiUpload } from './api-client';

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  method = '';
  url = '';
  withCredentials = false;
  status = 0;
  statusText = '';
  responseText = '';
  body: Document | XMLHttpRequestBodyInit | null = null;
  headers: Record<string, string> = {};
  responseHeaders: Record<string, string> = {};
  upload: XMLHttpRequestUpload = {} as XMLHttpRequestUpload;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    this.upload = { onprogress: null } as unknown as XMLHttpRequestUpload;
    MockXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  getResponseHeader(name: string) {
    return this.responseHeaders[name.toLowerCase()] ?? null;
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body;
  }

  abort() {
    this.onabort?.();
  }

  succeed(status: number, payload: unknown) {
    this.status = status;
    this.statusText = 'OK';
    this.responseText = JSON.stringify(payload);
    this.responseHeaders['content-type'] = 'application/json';
    this.onload?.();
  }

  progress(loaded: number, total: number) {
    (this.upload.onprogress as ((event: ProgressEvent) => void) | null)?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }
}

function installMockXhr() {
  MockXMLHttpRequest.instances = [];
  vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
}

describe('apiUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts FormData with credentials, auth and upload progress', async () => {
    installMockXhr();
    const onProgress = vi.fn();
    const body = new FormData();
    body.append('file', new File(['x'], 'scan.png', { type: 'image/png' }));

    const pending = apiUpload<{ id: string }>('/uploads', {
      body,
      accessToken: 'access-token',
      onProgress,
    });
    const xhr = MockXMLHttpRequest.instances[0];

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toContain('/uploads');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers.Authorization).toBe('Bearer access-token');
    expect(xhr.headers.Accept).toBe('application/json');
    expect(xhr.body).toBe(body);

    xhr.progress(25, 100);
    xhr.progress(80, 100);
    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 80);

    xhr.succeed(201, { id: 'upload-1' });
    await expect(pending).resolves.toEqual({ id: 'upload-1' });
  });

  it('rejects with the server error envelope', async () => {
    installMockXhr();
    const pending = apiUpload('/uploads', { body: new FormData() });
    const xhr = MockXMLHttpRequest.instances[0];

    xhr.status = 422;
    xhr.statusText = 'Unprocessable Entity';
    xhr.responseText = JSON.stringify({ message: 'File type not allowed' });
    xhr.responseHeaders['content-type'] = 'application/json';
    xhr.onload?.();

    await expect(pending).rejects.toMatchObject({
      name: 'ApiError',
      message: 'File type not allowed',
      status: 422,
    });
    await expect(pending).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects with a network error when the request fails', async () => {
    installMockXhr();
    const pending = apiUpload('/uploads', { body: new FormData() });
    MockXMLHttpRequest.instances[0].onerror?.();

    await expect(pending).rejects.toMatchObject({ message: 'Network error while uploading', status: 0 });
  });

  it('aborts the request when the caller signal is aborted', async () => {
    installMockXhr();
    const controller = new AbortController();
    const pending = apiUpload('/uploads', { body: new FormData(), signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects immediately when the signal is already aborted', async () => {
    installMockXhr();
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiUpload('/uploads', { body: new FormData(), signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(MockXMLHttpRequest.instances).toHaveLength(0);
  });
});
