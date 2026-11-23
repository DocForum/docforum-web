import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  afterEach(() => {
    // The manager is a module singleton — never leak a state into the next test.
    onlineManager.setOnline(true);
    vi.restoreAllMocks();
  });

  it('reports online by default', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it('follows the manager offline and back online', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe(false);

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe(true);
  });

  it('stops listening once the component unmounts', () => {
    const unsubscribe = vi.fn();
    vi.spyOn(onlineManager, 'subscribe').mockImplementation(() => () => unsubscribe());

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
