import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../store/auth-store';
import * as resultsService from '../../../services/results-service';
import { usePendingAbnormalResults } from './useResults';

const harness = vi.hoisted(() => ({ live: false }));

vi.mock('../../../hooks/useRealtimeLive', () => ({
  useRealtimeLive: () => harness.live,
}));
vi.mock('../../../services/results-service');

describe('abnormal-results polling modes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    harness.live = false;
    useAuthStore.setState({ accessToken: 'test-token' });
    vi.mocked(resultsService.listPendingAbnormalResults)
      .mockReset()
      .mockResolvedValue([] as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls every 30 seconds while the stream is down', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    renderHook(() => usePendingAbnormalResults(), { wrapper });

    await vi.waitFor(() => expect(resultsService.listPendingAbnormalResults).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(resultsService.listPendingAbnormalResults).toHaveBeenCalledTimes(2));
  });

  it('keeps only a slower 60 second safety poll while the stream is live', async () => {
    harness.live = true;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    renderHook(() => usePendingAbnormalResults(), { wrapper });

    await vi.waitFor(() => expect(resultsService.listPendingAbnormalResults).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(resultsService.listPendingAbnormalResults).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(resultsService.listPendingAbnormalResults).toHaveBeenCalledTimes(2));
  });
});
