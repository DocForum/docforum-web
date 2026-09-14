import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSlowRequestHint } from './useSlowRequestHint';

// Real timers with small delays rather than vi.useFakeTimers() — fake
// timers interact badly with Testing Library's auto-cleanup in this
// environment (afterEach hangs). Delays here are small enough that the
// suite stays fast.

describe('useSlowRequestHint', () => {
  it('is false while not pending', () => {
    const { result } = renderHook(() => useSlowRequestHint(false, 20));
    expect(result.current).toBe(false);
  });

  it('stays false before the delay elapses', async () => {
    const { result } = renderHook(() => useSlowRequestHint(true, 200));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBe(false);
  });

  it('flips true once the delay elapses while still pending', async () => {
    const { result } = renderHook(() => useSlowRequestHint(true, 20));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('resets to false as soon as pending ends', async () => {
    const { result, rerender } = renderHook(({ pending }) => useSlowRequestHint(pending, 20), {
      initialProps: { pending: true },
    });
    await waitFor(() => expect(result.current).toBe(true));

    rerender({ pending: false });
    expect(result.current).toBe(false);
  });
});
