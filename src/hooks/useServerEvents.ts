import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  eventStreamManager,
  type EventStreamState,
  type ServerEvent,
  type ServerEventName,
} from '../services/event-stream-service';

const subscribeStreamState = (listener: () => void): (() => void) =>
  eventStreamManager.subscribeState(listener);
const getStreamState = (): EventStreamState => eventStreamManager.getState();

/**
 * Subscribe to one typed SSE event. All callers share the tab-wide
 * connection manager (never more than one connection per tab); the
 * subscription is removed on unmount, and the connection closes when the
 * last subscriber leaves.
 */
export function useServerEvent<K extends ServerEventName>(
  type: K,
  handler: (event: ServerEvent<K>) => void,
  options: { enabled?: boolean } = {},
): void {
  const handlerRef = useRef(handler);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    return eventStreamManager.subscribe(type, (event) => handlerRef.current(event), { enabled });
  }, [type, enabled]);
}

export function useEventStreamState(): EventStreamState {
  return useSyncExternalStore(subscribeStreamState, getStreamState, getStreamState);
}

export function useRealtimeConnected(): boolean {
  return useEventStreamState() === 'open';
}
