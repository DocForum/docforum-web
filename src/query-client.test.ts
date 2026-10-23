import { describe, expect, it } from 'vitest';
import { retryDelay, shouldRetry } from './query-client';
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
