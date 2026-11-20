import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import { useQueue, useRunningDelay } from './useQueue';

const harness = vi.hoisted(() => ({ live: false }));

vi.mock('../../../hooks/useRealtimeLive', () => ({
  useRealtimeLive: () => harness.live,
}));
vi.mock('../../../services/queue-service');

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('queue polling modes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    harness.live = false;
    useAuthStore.setState({ accessToken: 'test-token' });
    vi.mocked(queueService.listQueue).mockReset().mockResolvedValue([] as never);
    vi.mocked(queueService.getRunningDelay).mockReset().mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls the queue and running delay every 30 seconds while the stream is down', async () => {
    const { wrapper } = makeWrapper();
    renderHook(
      () => {
        useQueue();
        useRunningDelay();
      },
      { wrapper },
    );

    await vi.waitFor(() => expect(queueService.listQueue).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(queueService.getRunningDelay).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(queueService.listQueue).toHaveBeenCalledTimes(2));
    expect(queueService.getRunningDelay).toHaveBeenCalledTimes(2);
  });

  it('does not poll either query while the stream is live', async () => {
    harness.live = true;
    const { wrapper } = makeWrapper();
    renderHook(
      () => {
        useQueue();
        useRunningDelay();
      },
      { wrapper },
    );

    await vi.waitFor(() => expect(queueService.listQueue).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(queueService.getRunningDelay).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(90_000);
    expect(queueService.listQueue).toHaveBeenCalledTimes(1);
    expect(queueService.getRunningDelay).toHaveBeenCalledTimes(1);
  });

  it('stops future polls when the stream connects', async () => {
    const { wrapper } = makeWrapper();
    const { rerender } = renderHook(
      () => {
        useQueue();
        useRunningDelay();
      },
      { wrapper },
    );

    await vi.waitFor(() => expect(queueService.listQueue).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(queueService.listQueue).toHaveBeenCalledTimes(2));

    harness.live = true;
    rerender();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(queueService.listQueue).toHaveBeenCalledTimes(2);
    expect(queueService.getRunningDelay).toHaveBeenCalledTimes(2);
  });
});
