import { describe, expect, it } from 'vitest';
import { QueryObserver } from '@tanstack/react-query';
import { queryClient, retryDelay, shouldRetry } from './query-client';
import { doctorKeys, paymentKeys, STALE_TIME } from './query-keys';
import { ApiError, RateLimitError } from './services/api-client';

describe('query retry policy', () => {
  it('never retries sooner than Retry-After allows', () => {
    expect(retryDelay(1, new RateLimitError('Too many requests', 45))).toBe(45_000);
    expect(retryDelay(3, new RateLimitError('Too many requests', 5))).toBe(5_000);
  });

  it('backs off exponentially for ordinary failures, capped', () => {
    expect(retryDelay(1, new ApiError('Server error', 500))).toBe(1_000);
    expect(retryDelay(2, new ApiError('Server error', 500))).toBe(2_000);
    expect(retryDelay(9, new ApiError('Server error', 500))).toBe(30_000);
  });

  it('retries once', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(1)).toBe(false);
  });
});

describe('query freshness policy', () => {
  it('keeps reference data on remount within its stale time', async () => {
    const key = doctorKeys.specialties();
    queryClient.removeQueries({ queryKey: key });
    let requests = 0;
    const queryFn = async () => { requests += 1; return ['cardiology']; };
    const first = new QueryObserver(queryClient, { queryKey: key, queryFn });
    const unmount = first.subscribe(() => undefined);
    await queryClient.fetchQuery({ queryKey: key, queryFn });
    unmount();
    const remount = new QueryObserver(queryClient, { queryKey: key, queryFn });
    const unmountAgain = remount.subscribe(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    unmountAgain();
    expect(requests).toBe(1);
    expect(queryClient.getQueryDefaults(key).staleTime).toBe(STALE_TIME.reference);
  });

  it('keeps payment data live', () => {
    expect(queryClient.getQueryDefaults(paymentKeys.intent('intent-1')).staleTime).toBe(0);
  });
});
