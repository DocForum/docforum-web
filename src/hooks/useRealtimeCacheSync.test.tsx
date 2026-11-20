import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { eventStreamManager } from '../services/event-stream-service';
import type { ServerEvent, ServerEventName } from '../services/event-stream-service';
import { useFlag } from '../features/feature-flags/hooks/useFlags';
import { useAuthStore } from '../store/auth-store';
import { makeUser } from '../test/factories';
import { useRealtimeCacheSync } from './useRealtimeCacheSync';

vi.mock('../services/event-stream-service', () => ({
  eventStreamManager: {
    subscribe: vi.fn(),
    clearReplay: vi.fn(),
  },
}));

vi.mock('../features/feature-flags/hooks/useFlags', () => ({
  useFlag: vi.fn(() => true),
}));

type Handler = (event: ServerEvent) => void;

function subscribeCalls(): [ServerEventName, Handler][] {
  return vi.mocked(eventStreamManager.subscribe).mock.calls as unknown as [
    ServerEventName,
    Handler,
  ][];
}

/** The handler the hook registered for one event name. */
function handlerFor(type: ServerEventName): Handler {
  const found = subscribeCalls().find((call) => call[0] === type);
  if (!found) throw new Error(`no subscription for ${type}`);
  return found[1];
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Call-through: the caches stay authoritative, the test only observes keys.
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    invalidate,
    render: () => renderHook(() => useRealtimeCacheSync(), { wrapper }),
  };
}

describe('useRealtimeCacheSync', () => {
  beforeEach(() => {
    vi.mocked(eventStreamManager.subscribe).mockReset();
    vi.mocked(eventStreamManager.subscribe).mockImplementation(() => () => {});
    vi.mocked(eventStreamManager.clearReplay).mockReset();
    vi.mocked(useFlag).mockReset();
    vi.mocked(useFlag).mockReturnValue(true);
    useAuthStore.getState().setSession(makeUser({ id: 'usr-1' }), 'test-token');
  });

  it('subscribes to exactly the four cache-refreshing events', () => {
    setup().render();

    expect(subscribeCalls().map((call) => call[0])).toEqual([
      'notification.created',
      'queue.updated',
      'message.created',
      'admin.alert',
    ]);
    expect(useFlag).toHaveBeenCalledWith('realtime_updates');
  });

  it('refreshes notifications and the doctor inbox on notification.created', () => {
    const { invalidate, render } = setup();
    render();
    act(() => handlerFor('notification.created')({ type: 'notification.created', data: {}, id: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['doctor', 'messages'] });
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('refreshes the queue and the appointment lists on queue.updated', () => {
    const { invalidate, render } = setup();
    render();
    act(() => handlerFor('queue.updated')({ type: 'queue.updated', data: {}, id: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['doctor', 'queue'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['doctor', 'appointments'] });
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('refreshes only inbox threads on message.created', () => {
    const { invalidate, render } = setup();
    render();
    act(() => handlerFor('message.created')({ type: 'message.created', data: {}, id: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['doctor', 'messages'] });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('refreshes only admin data on admin.alert', () => {
    const { invalidate, render } = setup();
    render();
    act(() => handlerFor('admin.alert')({ type: 'admin.alert', data: {}, id: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin'] });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('leaves every cache alone while the realtime_updates flag is off', () => {
    vi.mocked(useFlag).mockReturnValue(false);
    const { invalidate, render } = setup();

    render();

    expect(eventStreamManager.subscribe).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does not subscribe for a signed-out visitor', () => {
    useAuthStore.getState().clearSession();
    const { invalidate, render } = setup();

    render();

    expect(eventStreamManager.subscribe).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('forgets the replay cursor on mount and when the signed-in user changes', () => {
    const { render } = setup();
    const { unmount } = render();
    expect(eventStreamManager.clearReplay).toHaveBeenCalledTimes(1);

    act(() => {
      useAuthStore.getState().setSession(makeUser({ id: 'usr-2' }), 'test-token');
    });
    // The previous subscription's teardown plus the new mount effect.
    expect(eventStreamManager.clearReplay).toHaveBeenCalledTimes(3);

    unmount();
    expect(eventStreamManager.clearReplay).toHaveBeenCalledTimes(4);
  });
});
