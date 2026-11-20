import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appointmentKeys, queueKeys, resultKeys } from '../query-keys';
import { useAuthStore } from '../store/auth-store';
import { useRealtimeCacheSync } from './useRealtimeCacheSync';

const harness = vi.hoisted(() => ({
  live: false,
  handlers: new Map<string, (event: unknown) => void>(),
}));

vi.mock('./useServerEvents', () => ({
  useServerEvent: (type: string, handler: (event: unknown) => void) => {
    harness.handlers.set(type, handler);
  },
}));
vi.mock('./useRealtimeLive', () => ({
  useRealtimeLive: () => harness.live,
}));
vi.mock('../features/feature-flags/hooks/useFlags', () => ({
  useFlag: () => true,
}));

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useRealtimeCacheSync', () => {
  beforeEach(() => {
    harness.live = false;
    harness.handlers.clear();
    useAuthStore.setState({ accessToken: 'test-token', user: null });
  });

  it('invalidates the real queue keys when queue.updated arrives', () => {
    const { wrapper, queryClient } = makeWrapper();
    renderHook(() => useRealtimeCacheSync(), { wrapper });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    expect([...harness.handlers.keys()]).not.toContain('results.updated');
    act(() => {
      harness.handlers.get('queue.updated')?.({ appointmentId: 'appt-1' });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queueKeys.today() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queueKeys.runningDelay() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentKeys.today() });
  });

  it('refetches queue and results once when the stream reconnects', () => {
    const { wrapper, queryClient } = makeWrapper();
    const { rerender } = renderHook(() => useRealtimeCacheSync(), { wrapper });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    expect(invalidate).not.toHaveBeenCalled();

    harness.live = true;
    rerender();

    for (const key of [
      queueKeys.today(),
      queueKeys.runningDelay(),
      appointmentKeys.today(),
      resultKeys.pendingAbnormal(),
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
    const callsAfterReconnect = invalidate.mock.calls.length;

    rerender();
    expect(invalidate).toHaveBeenCalledTimes(callsAfterReconnect);
  });
});
