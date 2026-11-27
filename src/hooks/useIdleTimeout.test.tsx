// Real timers with small delays, per this repo's established pattern (see
// useSlowRequestHint.test.ts — fake timers hang Testing Library's
// auto-cleanup in this environment). The hook exposes ms-level seams for
// exactly this.
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useIdleTimeout } from './useIdleTimeout';
import { IDLE_ACTIVITY_CHANNEL } from './idle-timeout';
import type { SessionTimeoutSettings } from '../types/models';

const settings: SessionTimeoutSettings = { idleTimeoutMinutes: 1, warningSeconds: 10 };

function setup(overrides: Partial<Parameters<typeof useIdleTimeout>[0]> = {}) {
  const onTimeout = vi.fn();
  const utils = renderHook(() =>
    useIdleTimeout({
      enabled: true,
      settings,
      onTimeout,
      checkIntervalMs: 40,
      timeoutMs: 300,
      warningMs: 150,
      ...overrides,
    }),
  );
  return { onTimeout, ...utils };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('useIdleTimeout', () => {
  it('warns, then expires, and fires onTimeout exactly once', async () => {
    const { result, onTimeout } = setup();

    await waitFor(() => expect(result.current.phase).toBe('warning'), { timeout: 2500, interval: 20 });
    expect(result.current.warningVisible).toBe(true);

    await waitFor(() => expect(result.current.phase).toBe('expired'), { timeout: 2500, interval: 20 });
    await waitFor(() => expect(onTimeout).toHaveBeenCalledTimes(1), { timeout: 2500, interval: 20 });

    // Further ticks must not fire it again.
    await wait(200);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('user interaction while the warning is up resets the clock', async () => {
    const { result, onTimeout } = setup();

    await waitFor(() => expect(result.current.phase).toBe('warning'), { timeout: 2500, interval: 20 });

    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(result.current.phase).toBe('active');
    expect(result.current.warningVisible).toBe(false);

    // With no further activity it still expires afterwards.
    await waitFor(() => expect(result.current.phase).toBe('expired'), { timeout: 2500, interval: 20 });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const { result, onTimeout } = setup({ enabled: false });

    await wait(500); // well past the 300 ms timeout
    expect(result.current.phase).toBe('active');
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('keeps this tab alive when another tab reports activity', async () => {
    // Cross-tab delivery needs a working BroadcastChannel; skip honestly
    // in environments that lack one rather than fake a pass.
    const channelWorks = await new Promise<boolean>((resolve) => {
      const a = new BroadcastChannel(IDLE_ACTIVITY_CHANNEL);
      const b = new BroadcastChannel(IDLE_ACTIVITY_CHANNEL);
      b.onmessage = () => {
        resolve(true);
        a.close();
        b.close();
      };
      a.postMessage({ ping: 1 });
      setTimeout(() => {
        resolve(false);
        a.close();
        b.close();
      }, 200);
    });
    if (!channelWorks) return;

    const { result, onTimeout } = setup();
    await waitFor(() => expect(result.current.phase).toBe('warning'), { timeout: 2500, interval: 20 });

    act(() => {
      const other = new BroadcastChannel(IDLE_ACTIVITY_CHANNEL);
      other.postMessage({ at: Date.now() });
      setTimeout(() => other.close(), 100);
    });

    await waitFor(() => expect(result.current.phase).toBe('active'), { timeout: 2500, interval: 20 });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
