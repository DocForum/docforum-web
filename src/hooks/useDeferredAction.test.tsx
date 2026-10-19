import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../components/Toast';
import { useToastStore } from '../store/toast-store';
import { useDeferredAction } from './useDeferredAction';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.getState().clear();
});

afterEach(() => {
  vi.useRealTimers();
  useToastStore.getState().clear();
});

describe('useDeferredAction', () => {
  it('defers the commit and exposes Undo in the toast', async () => {
    render(<Toaster />);
    const apply = vi.fn();
    const undo = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => {
      result.current.run({ id: 'row-1', apply, undo, commit });
    });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('undoes without calling the API', () => {
    render(<Toaster />);
    const undo = vi.fn();
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => {
      result.current.run({ id: 'row-1', apply: vi.fn(), undo, commit });
    });
    act(() => {
      result.current.undo('row-1');
    });

    expect(undo).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.some((item) => item.message === 'Action undone.')).toBe(true);
  });

  it('rolls back and shows the error when the commit fails', async () => {
    render(<Toaster />);
    const undo = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => {
      result.current.run({
        id: 'row-1',
        apply: vi.fn(),
        undo,
        commit: () => Promise.reject(new Error('Network down')),
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
  });

  it('reverts a still-pending action when the component unmounts', () => {
    const undo = vi.fn();
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredAction(1000));

    act(() => {
      result.current.run({ id: 'row-1', apply: vi.fn(), undo, commit });
    });
    unmount();

    expect(undo).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });
});
