import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryAfterCountdown } from './useRetryAfterCountdown';

describe('useRetryAfterCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down to zero and unlocks', () => {
    const { result } = renderHook(() => useRetryAfterCountdown());

    act(() => result.current.start(3));
    expect(result.current.secondsRemaining).toBe(3);
    expect(result.current.isLockedOut).toBe(true);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(2);

    act(() => vi.advanceTimersByTime(2_500));
    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isLockedOut).toBe(false);
  });

  it('resets on demand', () => {
    const { result } = renderHook(() => useRetryAfterCountdown());

    act(() => result.current.start(30));
    act(() => result.current.reset());

    expect(result.current.isLockedOut).toBe(false);
  });
});
