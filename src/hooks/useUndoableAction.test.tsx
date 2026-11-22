import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToastStore } from '../store/toast-store';
import { UNDO_WINDOW_MS, useUndoableAction, type UndoableActionOptions } from './useUndoableAction';

afterEach(() => {
  vi.useRealTimers();
});

function options(overrides: Partial<UndoableActionOptions> = {}) {
  const revert = vi.fn();
  const opts: UndoableActionOptions = {
    message: 'Archived.',
    undoLabel: 'Undo',
    undoneMessage: 'Restored.',
    errorMessage: 'Could not archive.',
    apply: vi.fn(() => revert),
    commit: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  return { opts, revert };
}

const undo = () => act(() => useToastStore.getState().toasts[0].action!.onAction());

describe('useUndoableAction', () => {
  it('applies at once and commits only after the undo window', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUndoableAction());
    const { opts } = options();

    act(() => result.current.run(opts));
    expect(opts.apply).toHaveBeenCalledTimes(1);
    expect(opts.commit).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Archived.', durationMs: null });

    await act(async () => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS));
    expect(opts.commit).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
    // The undo toast is gone once the action is final.
    expect(useToastStore.getState().toasts.find((toast) => toast.message === 'Archived.')).toBeUndefined();
  });

  it('undo reverts locally and never calls the server', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUndoableAction());
    const { opts, revert } = options();

    act(() => result.current.run(opts));
    undo();
    await act(async () => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2));

    expect(revert).toHaveBeenCalledTimes(1);
    expect(opts.commit).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
    expect(useToastStore.getState().toasts).toEqual([expect.objectContaining({ message: 'Restored.', tone: 'success' })]);
  });

  it('reverts and shows an error toast when the delayed commit fails', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUndoableAction());
    const { opts, revert } = options({ commit: vi.fn(() => Promise.reject(new Error('500'))) });

    act(() => result.current.run(opts));
    await act(async () => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS));

    expect(revert).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ tone: 'error', message: 'Could not archive.' }),
    ]);
  });

  it('commits a pending action when the screen unmounts instead of dropping it', async () => {
    const { result, unmount } = renderHook(() => useUndoableAction());
    const { opts } = options();
    act(() => result.current.run(opts));
    unmount();
    expect(opts.commit).toHaveBeenCalledTimes(1);
  });

  it('commits the first action when a second one starts', () => {
    const { result } = renderHook(() => useUndoableAction());
    const first = options();
    const second = options();
    act(() => result.current.run(first.opts));
    act(() => result.current.run(second.opts));
    expect(first.opts.commit).toHaveBeenCalledTimes(1);
    expect(second.opts.commit).not.toHaveBeenCalled();
  });
});
