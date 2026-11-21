import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventStreamManager, type EventStreamState } from '../services/event-stream-service';
import { useEventStreamState, useRealtimeConnected } from './useServerEvents';

describe('stream state hooks', () => {
  let current: EventStreamState;
  let listeners: Set<(state: EventStreamState) => void>;

  beforeEach(() => {
    current = 'idle';
    listeners = new Set();
    vi.spyOn(eventStreamManager, 'getState').mockImplementation(() => current);
    vi.spyOn(eventStreamManager, 'subscribeState').mockImplementation((handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-renders on connection state changes and unsubscribes on unmount', () => {
    const { result, unmount } = renderHook(() => useEventStreamState());
    expect(result.current).toBe('idle');

    act(() => {
      current = 'open';
      for (const listener of listeners) listener(current);
    });
    expect(result.current).toBe('open');

    unmount();
    expect(listeners.size).toBe(0);
  });

  it('is connected only while the stream is open', () => {
    const { result, rerender } = renderHook(() => useRealtimeConnected());
    expect(result.current).toBe(false);

    for (const state of ['connecting', 'reconnecting', 'error'] as const) {
      act(() => {
        current = state;
        for (const listener of listeners) listener(current);
      });
      rerender();
      expect(result.current).toBe(false);
    }

    act(() => {
      current = 'open';
      for (const listener of listeners) listener(current);
    });
    rerender();
    expect(result.current).toBe(true);
  });
});
