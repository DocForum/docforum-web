import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { eventStreamManager } from '../services/event-stream-service';
import type { ServerEvent, ServerEventName } from '../services/event-stream-service';
import { useServerEvent } from './useServerEvents';

// No real connections: the tab-wide manager is replaced with a recorder.
vi.mock('../services/event-stream-service', () => ({
  eventStreamManager: {
    subscribe: vi.fn(),
    clearReplay: vi.fn(),
  },
}));

type Handler = (event: ServerEvent) => void;

const unsubscribeCalls = vi.fn();

function subscribeCalls() {
  return vi.mocked(eventStreamManager.subscribe).mock.calls as unknown as [
    string,
    Handler,
    { enabled?: boolean },
  ][];
}

function lastHandler(): Handler {
  const calls = subscribeCalls();
  return calls[calls.length - 1][1];
}

describe('useServerEvent', () => {
  beforeEach(() => {
    vi.mocked(eventStreamManager.subscribe).mockReset();
    unsubscribeCalls.mockReset();
    vi.mocked(eventStreamManager.subscribe).mockImplementation(() => () => unsubscribeCalls());
  });

  it('subscribes to the requested event type when mounted', () => {
    renderHook(() => useServerEvent('queue.updated', () => {}));

    expect(subscribeCalls()).toHaveLength(1);
    expect(subscribeCalls()[0][0]).toBe('queue.updated');
    expect(subscribeCalls()[0][2]).toEqual({ enabled: true });
  });

  it('delivers an event to the handler', () => {
    const seen = vi.fn();
    renderHook(() => useServerEvent('queue.updated', seen));

    act(() => lastHandler()({ type: 'queue.updated', data: { appointmentId: 'apt-1' }, id: '7' }));

    expect(seen).toHaveBeenCalledWith({
      type: 'queue.updated',
      data: { appointmentId: 'apt-1' },
      id: '7',
    });
  });

  it('calls the newest handler without resubscribing when the handler changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ handler }) => useServerEvent('queue.updated', handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });

    expect(subscribeCalls()).toHaveLength(1);
    act(() => lastHandler()({ type: 'queue.updated', data: {}, id: null }));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useServerEvent('queue.updated', () => {}));

    unmount();

    expect(unsubscribeCalls).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while disabled', () => {
    renderHook(() => useServerEvent('queue.updated', () => {}, { enabled: false }));

    expect(eventStreamManager.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes when enabled flips on and unsubscribes when it flips off', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useServerEvent('queue.updated', () => {}, { enabled }),
      { initialProps: { enabled: false } },
    );

    expect(eventStreamManager.subscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(subscribeCalls()).toHaveLength(1);

    rerender({ enabled: false });
    expect(unsubscribeCalls).toHaveBeenCalledTimes(1);
    expect(subscribeCalls()).toHaveLength(1);
  });

  it('resubscribes when the event type changes', () => {
    const { rerender } = renderHook(
      ({ type }: { type: ServerEventName }) => useServerEvent(type, () => {}),
      { initialProps: { type: 'queue.updated' as ServerEventName } },
    );

    rerender({ type: 'message.created' });

    expect(subscribeCalls().map((call) => call[0])).toEqual(['queue.updated', 'message.created']);
    expect(unsubscribeCalls).toHaveBeenCalledTimes(1);
  });
});
