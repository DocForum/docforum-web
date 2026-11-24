import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnnouncer } from './useAnnouncer';

afterEach(() => {
  vi.useRealTimers();
});

describe('useAnnouncer', () => {
  it('batches rapid updates into a single announcement', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer(800));

    act(() => {
      result.current.announce('Queue updated. 2 waiting.');
      result.current.announce('Ada Patient checked in.');
      result.current.announce('Ada Patient checked in.');
    });

    expect(result.current.message).toBe('');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Duplicates collapsed; both distinct messages present.
    expect(result.current.message).toBe(
      'Queue updated. 2 waiting. Ada Patient checked in.',
    );
  });

  it('does not announce the same batch twice, and can be reset', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer(100));

    act(() => {
      result.current.announce('One update.');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.message).toBe('One update.');

    act(() => {
      result.current.reset();
    });
    expect(result.current.message).toBe('');
  });

  it('resolves function messages when the batch flushes and skips empty ones', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer(100));
    let count = 1;

    act(() => {
      result.current.announce(() => `${count} new.`);
      result.current.announce(() => '');
    });
    count = 3;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.message).toBe('3 new.');
  });

  it('re-announces a batch that reads the same as the previous one', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer(100));

    act(() => {
      result.current.announce('Saved.');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const first = result.current.message;

    act(() => {
      result.current.announce('Saved.');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.message.trim()).toBe('Saved.');
    expect(result.current.message).not.toBe(first);
  });
});
