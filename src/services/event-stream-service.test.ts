import { describe, expect, it, vi } from 'vitest';
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  EventStreamManager,
  backoffDelay,
  parseEventStream,
  type RawServerEvent,
  type StreamRequest,
} from './event-stream-service';
import { ApiError } from './api-client';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<RawServerEvent[]> {
  const events: RawServerEvent[] = [];
  for await (const event of parseEventStream(streamOf(chunks))) events.push(event);
  return events;
}

describe('SSE parser', () => {
  it('parses events split across chunks, with comments and multi-line data', async () => {
    const events = await collect([
      'id: 1\nevent: queue.upd',
      'ated\ndata: {"appointmentId":"a"}\n',
      '\n: heartbeat\n\n',
      'event: message.created\ndata: line one\ndata: line two\n\n',
    ]);

    expect(events).toEqual([
      { id: '1', event: 'queue.updated', data: '{"appointmentId":"a"}', retry: undefined },
      { id: '1', event: 'message.created', data: 'line one\nline two', retry: undefined },
    ]);
  });

  it('handles CRLF line endings and a trailing event without a final blank line', async () => {
    const events = await collect(['event: notification.created\r\ndata: {}\r\n\r\n', 'data: last']);
    expect(events).toHaveLength(2);
    expect(events[1].data).toBe('last');
  });

  it('reads a retry hint', async () => {
    const events = await collect(['retry: 2500\nid: 9\ndata: x\n\n']);
    expect(events[0]).toMatchObject({ id: '9', retry: 2500 });
  });
});

describe('backoffDelay', () => {
  it('backs off exponentially and caps at the maximum', () => {
    expect(backoffDelay(0)).toBe(BACKOFF_BASE_MS);
    expect(backoffDelay(1)).toBe(BACKOFF_BASE_MS * 2);
    expect(backoffDelay(2)).toBe(BACKOFF_BASE_MS * 4);
    expect(backoffDelay(99)).toBe(BACKOFF_MAX_MS);
  });
});

interface Scheduled {
  callback: () => void;
  delay: number;
}

function makeManager(transport: (request: StreamRequest) => Promise<AsyncIterable<RawServerEvent>>, token = 'token-1') {
  const scheduled: Scheduled[] = [];
  let currentToken = token;
  const refreshAccessToken = vi.fn(async () => {
    currentToken = 'token-2';
    return currentToken;
  });

  const manager = new EventStreamManager({
    getAccessToken: () => currentToken,
    refreshAccessToken,
    transport,
    schedule: (callback, delay) => {
      const handle = { callback, delay } as unknown as ReturnType<typeof setTimeout>;
      scheduled.push({ callback, delay });
      return handle;
    },
    cancel: () => {},
    getDocument: () => null,
  });

  return { manager, scheduled, refreshAccessToken, getToken: () => currentToken };
}

async function* events(...items: RawServerEvent[]): AsyncGenerator<RawServerEvent> {
  for (const item of items) yield item;
}

describe('EventStreamManager', () => {
  it('opens exactly one connection for multiple subscribers and routes typed events', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      return events(
        { id: '1', event: 'queue.updated', data: '{"appointmentId":"apt-1"}' },
        { id: '2', event: 'message.created', data: '{"threadId":"th-1"}' },
      );
    });
    const { manager } = makeManager(transport);

    const queueHandler = vi.fn();
    const messageHandler = vi.fn();
    const unsubQueue = manager.subscribe('queue.updated', queueHandler);
    const unsubMessage = manager.subscribe('message.created', messageHandler);

    await vi.waitFor(() => expect(queueHandler).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(messageHandler).toHaveBeenCalledTimes(1));

    expect(transport).toHaveBeenCalledTimes(1);
    expect(queueHandler.mock.calls[0][0].data).toEqual({ appointmentId: 'apt-1' });
    expect(messageHandler.mock.calls[0][0].data).toEqual({ threadId: 'th-1' });

    unsubQueue();
    unsubMessage();
    expect(manager.getState()).toBe('idle');
  });

  it('reconnects with Last-Event-ID after the stream ends', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      if (requests.length === 1) {
        return events({ id: 'evt-7', event: 'queue.updated', data: '{}' });
      }
      return events();
    });
    const { manager, scheduled } = makeManager(transport);

    const handler = vi.fn();
    const unsubscribe = manager.subscribe('queue.updated', handler);

    await vi.waitFor(() => expect(scheduled.length).toBeGreaterThan(0));
    expect(scheduled[0].delay).toBe(BACKOFF_BASE_MS);

    scheduled[0].callback();
    await vi.waitFor(() => expect(requests.length).toBe(2));
    expect(requests[1].lastEventId).toBe('evt-7');

    unsubscribe();
  });

  it('refreshes the token on an auth-expiry event and reconnects with the new token', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      if (requests.length === 1) {
        return events({ id: null, event: 'auth.expired', data: '{}' });
      }
      return events();
    });
    const { manager, scheduled, refreshAccessToken } = makeManager(transport);

    const unsubscribe = manager.subscribe('queue.updated', vi.fn());

    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(scheduled.length).toBeGreaterThan(0));

    scheduled[0].callback();
    await vi.waitFor(() => expect(requests.length).toBe(2));
    expect(requests[1].accessToken).toBe('token-2');

    unsubscribe();
  });

  it('refreshes and retries once when the transport answers 401', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      if (requests.length === 1) throw new ApiError('expired', 401);
      return events();
    });
    const { manager, scheduled, refreshAccessToken } = makeManager(transport);

    const unsubscribe = manager.subscribe('queue.updated', vi.fn());

    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(scheduled.length).toBeGreaterThan(0));

    scheduled[0].callback();
    await vi.waitFor(() => expect(requests.length).toBe(2));
    expect(requests[1].accessToken).toBe('token-2');

    unsubscribe();
  });

  it('closes after the tab stays hidden and reconnects when it becomes visible', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      // A stream that never emits: it just waits for the abort, which is
      // exactly the "connected but quiet" case under test.
      // eslint-disable-next-line require-yield -- no events is the point
      return (async function* () {
        await new Promise<void>((resolve) => {
          request.signal.addEventListener('abort', () => resolve(), { once: true });
        });
      })();
    });
    const scheduled: Scheduled[] = [];
    let visibility: DocumentVisibilityState = 'visible';
    const listeners = new Set<() => void>();
    const fakeDocument = {
      get visibilityState() {
        return visibility;
      },
      addEventListener: (_: string, handler: () => void) => listeners.add(handler),
      removeEventListener: (_: string, handler: () => void) => listeners.delete(handler),
    } as unknown as Document;
    const manager = new EventStreamManager({
      getAccessToken: () => 'token-1',
      refreshAccessToken: async () => 'token-1',
      transport,
      schedule: (callback, delay) => {
        const handle = { callback, delay } as unknown as ReturnType<typeof setTimeout>;
        scheduled.push({ callback, delay });
        return handle;
      },
      cancel: () => {},
      getDocument: () => fakeDocument,
    });

    const unsubscribe = manager.subscribe('queue.updated', vi.fn());
    await vi.waitFor(() => expect(requests.length).toBe(1));

    visibility = 'hidden';
    listeners.forEach((notify) => notify());
    const hiddenTimer = scheduled.find((item) => item.delay === 60_000);
    expect(hiddenTimer).toBeDefined();
    hiddenTimer!.callback();
    expect(manager.getState()).toBe('idle');

    visibility = 'visible';
    listeners.forEach((notify) => notify());
    await vi.waitFor(() => expect(requests.length).toBe(2));
    expect(requests[1].lastEventId).toBeNull();

    unsubscribe();
  });

  it('forgets the replay cursor when the account changes', async () => {
    const requests: StreamRequest[] = [];
    const transport = vi.fn(async (request: StreamRequest) => {
      requests.push(request);
      return events({ id: 'evt-old-account', event: 'queue.updated', data: '{}' });
    });
    const { manager, scheduled } = makeManager(transport);

    const unsubscribe = manager.subscribe('queue.updated', vi.fn());
    await vi.waitFor(() => expect(manager.getLastEventId()).toBe('evt-old-account'));
    await vi.waitFor(() => expect(scheduled.length).toBeGreaterThan(0));

    manager.clearReplay();
    expect(manager.getLastEventId()).toBeNull();

    scheduled[0].callback();
    await vi.waitFor(() => expect(requests.length).toBe(2));
    expect(requests[1].lastEventId).toBeNull();

    unsubscribe();
  });

  it('falls back to off/error when the refresh fails, and does not reconnect', async () => {
    const transport = vi.fn(async () => {
      throw new ApiError('expired', 401);
    });
    const manager = new EventStreamManager({
      getAccessToken: () => 'token-1',
      refreshAccessToken: async () => {
        throw new Error('refresh failed');
      },
      transport,
      schedule: () => 1 as unknown as ReturnType<typeof setTimeout>,
      cancel: () => {},
      getDocument: () => null,
    });

    const unsubscribe = manager.subscribe('queue.updated', vi.fn());

    await vi.waitFor(() => expect(manager.getState()).toBe('error'));
    expect(transport).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
