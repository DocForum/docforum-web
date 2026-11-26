import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ flag: false, connected: false }));

vi.mock('../features/feature-flags/hooks/useFlags', () => ({
  useFlag: () => harness.flag,
}));
vi.mock('./useServerEvents', () => ({
  useRealtimeConnected: () => harness.connected,
}));

import { useRealtimeLive } from './useRealtimeLive';

describe('useRealtimeLive', () => {
  it('is live only when the flag is on and the stream is open', () => {
    for (const flag of [false, true]) {
      for (const connected of [false, true]) {
        harness.flag = flag;
        harness.connected = connected;
        const { result, unmount } = renderHook(() => useRealtimeLive());
        expect(result.current).toBe(flag && connected);
        unmount();
      }
    }
  });
});
