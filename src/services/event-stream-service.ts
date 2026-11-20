// Shared Server-Sent Events client (issue #109). One fetch-based connection
// per tab — EventSource can't attach an Authorization header — with typed
// subscriptions, Last-Event-ID replay, exponential backoff, auth-aware
// token refresh, and a pause when the tab stays hidden.
import { ApiError, apiFetchStream } from './api-client';
import { refreshSessionSingleFlight } from './session-refresh';
import { useAuthStore } from '../store/auth-store';

export const EVENT_STREAM_PATH = '/events';

/** Assumed contract pending docforum-core#97: these are the event names the
 * frontend routes into React Query. Unknown names are still delivered to
 * wildcard subscribers. See ARCHITECTURE_ESSENTIALS.md "Known assumptions". */
export interface ServerEventMap {
  'notification.created': { notificationId?: string; type?: string };
  'queue.updated': { appointmentId?: string };
  'message.created': { threadId?: string };
  'admin.alert': { severity?: string; message?: string };
  'auth.expired': Record<string, never>;
}

export type ServerEventName = keyof ServerEventMap;

export interface ServerEvent<K extends ServerEventName = ServerEventName> {
  type: K;
  data: ServerEventMap[K];
  id: string | null;
}

export interface RawServerEvent {
  id: string | null;
  event: string;
  data: string;
  retry?: number;
}

export interface StreamRequest {
  path: string;
  accessToken: string | null;
  lastEventId: string | null;
  signal: AbortSignal;
}

export type StreamTransport = (request: StreamRequest) => Promise<AsyncIterable<RawServerEvent>>;

export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;

/** Hidden at least this long → close the connection; reconnect on focus. */
export const HIDDEN_CLOSE_DELAY_MS = 60_000;

export function backoffDelay(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt, 16));
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** exponent);
}

/**
 * Incremental SSE parser. Handles events split across chunks, CRLF, comment
 * lines, multi-line `data:` fields and the `retry:` hint. Cancelling the
 * reader (via the request's AbortSignal) ends the generator.
 */
export async function* parseEventStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<RawServerEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let id: string | null = null;
  let event = '';
  let dataLines: string[] = [];
  let retry: number | undefined;

  const dispatch = (): RawServerEvent | null => {
    if (dataLines.length === 0 && !event) {
      return null;
    }
    const payload: RawServerEvent = {
      id,
      event: event || 'message',
      data: dataLines.join('\n'),
      retry,
    };
    event = '';
    dataLines = [];
    retry = undefined;
    return payload;
  };

  const processLine = (rawLine: string): RawServerEvent | null => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '') return dispatch();
    if (line.startsWith(':')) return null; // heartbeat/comment

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    switch (field) {
      case 'id':
        id = value;
        break;
      case 'event':
        event = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'retry': {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) retry = parsed;
        break;
      }
      default:
        break;
    }
    return null;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf('\n');
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const parsed = processLine(line);
        if (parsed) yield parsed;
        newline = buffer.indexOf('\n');
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      const parsed = processLine(buffer);
      if (parsed) yield parsed;
    }
    const final = dispatch();
    if (final) yield final;
  } finally {
    reader.releaseLock();
  }
}

function decodeEventData(data: string): unknown {
  if (!data) return {};
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

export type EventStreamState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error';

type EventHandler = (event: ServerEvent) => void;
type StateHandler = (state: EventStreamState) => void;

export interface EventStreamDependencies {
  getAccessToken: () => string | null;
  /** Resolves with the new token, or rejects/null when the session is gone. */
  refreshAccessToken: () => Promise<string | null>;
  transport: StreamTransport;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (handle: ReturnType<typeof setTimeout>) => void;
  getDocument?: () => Document | null;
  hiddenCloseDelayMs?: number;
}

async function defaultTransport(request: StreamRequest): Promise<AsyncIterable<RawServerEvent>> {
  const response = await apiFetchStream(request.path, {
    accessToken: request.accessToken,
    lastEventId: request.lastEventId,
    signal: request.signal,
  });
  if (!response.body) throw new Error('docforum-core returned an empty event stream');
  return parseEventStream(response.body);
}

async function defaultRefresh(): Promise<string | null> {
  const session = await refreshSessionSingleFlight();
  return session.accessToken;
}

function defaultDependencies(): EventStreamDependencies {
  return {
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken: defaultRefresh,
    transport: defaultTransport,
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (handle) => clearTimeout(handle),
    getDocument: () => (typeof document === 'undefined' ? null : document),
    hiddenCloseDelayMs: HIDDEN_CLOSE_DELAY_MS,
  };
}

/**
 * One connection per tab. All `useServerEvent` subscriptions share this
 * manager; it opens the stream only while at least one listener exists and
 * closes it when the last one unsubscribes.
 */
export class EventStreamManager {
  private readonly deps: EventStreamDependencies;
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcardListeners = new Set<EventHandler>();
  private stateListeners = new Set<StateHandler>();
  private controller: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private closedForHidden = false;
  private attempt = 0;
  private lastEventId: string | null = null;
  private retryOverride: number | null = null;
  private state: EventStreamState = 'idle';
  private document: Document | null = null;

  constructor(dependencies: Partial<EventStreamDependencies> = {}) {
    this.deps = { ...defaultDependencies(), ...dependencies };
  }

  subscribe<K extends ServerEventName>(
    type: K,
    handler: (event: ServerEvent<K>) => void,
    options: { enabled?: boolean } = {},
  ): () => void {
    if (options.enabled === false) return () => {};
    const listeners = this.listeners.get(type) ?? new Set<EventHandler>();
    listeners.add(handler as EventHandler);
    this.listeners.set(type, listeners);
    this.start();

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(handler as EventHandler);
      if (listeners.size === 0) this.listeners.delete(type);
      if (this.listenerCount === 0) this.stop();
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.wildcardListeners.add(handler);
    this.start();
    return () => {
      this.wildcardListeners.delete(handler);
      if (this.listenerCount === 0) this.stop();
    };
  }

  subscribeState(handler: StateHandler): () => void {
    this.stateListeners.add(handler);
    return () => this.stateListeners.delete(handler);
  }

  getState(): EventStreamState {
    return this.state;
  }

  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /** Forget the replay cursor when the signed-in user changes; the next
   * account must never resume the previous account's event stream. The
   * open connection (if any) is closed by the subscription teardown that
   * follows a logout. */
  clearReplay(): void {
    this.lastEventId = null;
    this.attempt = 0;
    this.retryOverride = null;
  }

  private get listenerCount(): number {
    let count = this.wildcardListeners.size;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    this.document = this.deps.getDocument?.() ?? null;
    this.document?.addEventListener('visibilitychange', this.handleVisibility);
    this.connect();
  }

  private stop(): void {
    this.started = false;
    this.closedForHidden = false;
    this.attempt = 0;
    this.abortController();
    this.clearReconnect();
    if (this.hiddenTimer) {
      this.deps.cancel?.(this.hiddenTimer);
      this.hiddenTimer = null;
    }
    this.document?.removeEventListener('visibilitychange', this.handleVisibility);
    this.document = null;
    this.setState('idle');
  }

  private abortController(): void {
    this.controller?.abort();
    this.controller = null;
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      this.deps.cancel?.(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private connect(): void {
    if (!this.started || this.controller || this.reconnectTimer || this.closedForHidden) return;
    if (!this.deps.getAccessToken()) return;

    const controller = new AbortController();
    this.controller = controller;
    void this.run(controller);
  }

  private async run(controller: AbortController): Promise<void> {
    this.setState(this.attempt === 0 ? 'connecting' : 'reconnecting');

    try {
      const stream = await this.deps.transport({
        path: EVENT_STREAM_PATH,
        accessToken: this.deps.getAccessToken(),
        lastEventId: this.lastEventId,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      this.setState('open');
      this.attempt = 0;

      for await (const raw of stream) {
        if (controller.signal.aborted) break;
        if (raw.id) this.lastEventId = raw.id;
        if (raw.retry !== undefined) {
          // The server's hint is honoured once, then bounded backoff resumes.
          this.retryOverride = Math.min(BACKOFF_MAX_MS, Math.max(0, raw.retry));
        }

        if (raw.event === 'auth.expired' || raw.event === 'session.expired') {
          try {
            await this.deps.refreshAccessToken();
          } catch {
            this.fail();
            return;
          }
          break;
        }

        this.dispatch(raw.event || 'message', decodeEventData(raw.data), raw.id);
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      // A single `run` attempt can only fail once, so there is no retry to
      // guard against here: a 401 is always answered with one forced refresh.
      if (error instanceof ApiError && error.status === 401) {
        try {
          const token = await this.deps.refreshAccessToken();
          if (!token) {
            this.fail();
            return;
          }
          this.attempt = 0;
        } catch {
          this.fail();
          return;
        }
      }
      // Network/5xx/auth-after-refresh errors fall through to backoff below.
    } finally {
      if (this.controller === controller) this.controller = null;
    }

    if (!this.started || this.closedForHidden) return;
    this.scheduleReconnect();
  }

  private fail(): void {
    this.abortController();
    this.clearReconnect();
    this.setState('error');
  }

  private scheduleReconnect(): void {
    const hidden = this.document?.visibilityState === 'hidden';
    if (hidden) {
      // Don't burn reconnects in a background tab; visibilitychange resumes.
      this.setState('idle');
      return;
    }

    const delay = this.retryOverride ?? backoffDelay(this.attempt);
    this.retryOverride = null;
    this.attempt += 1;
    this.setState('reconnecting');
    this.reconnectTimer = this.deps.schedule?.(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay) ?? null;
  }

  private dispatch(type: string, data: unknown, id: string | null): void {
    const event: ServerEvent = { type: type as ServerEventName, data: data as never, id };
    for (const handler of this.listeners.get(type) ?? []) handler(event);
    for (const handler of this.wildcardListeners) handler(event);
  }

  private setState(state: EventStreamState): void {
    if (this.state === state) return;
    this.state = state;
    for (const handler of this.stateListeners) handler(state);
  }

  private handleVisibility = (): void => {
    if (!this.document) return;
    const hidden = this.document.visibilityState === 'hidden';

    if (hidden) {
      if (this.hiddenTimer) this.deps.cancel?.(this.hiddenTimer);
      this.hiddenTimer = this.deps.schedule?.(() => {
        this.hiddenTimer = null;
        if (!this.started) return;
        this.closedForHidden = true;
        this.abortController();
        this.clearReconnect();
        this.setState('idle');
      }, this.deps.hiddenCloseDelayMs ?? HIDDEN_CLOSE_DELAY_MS) ?? null;
      return;
    }

    if (this.hiddenTimer) {
      this.deps.cancel?.(this.hiddenTimer);
      this.hiddenTimer = null;
    }
    if (this.closedForHidden) {
      this.closedForHidden = false;
      this.attempt = 0;
      this.connect();
    }
  };
}

/** The tab-wide singleton every hook subscribes through. */
export const eventStreamManager = new EventStreamManager();
