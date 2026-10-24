import { useCallback, useEffect, useRef } from 'react';
import { toast } from '../store/toast-store';

export interface DeferredAction<TResult = unknown> {
  /** One in-flight action per id; a second call replaces the first. */
  id: string;
  /** Applied immediately, before the API call is made. */
  apply: () => void;
  /** Reverts `apply` when the user taps Undo or the API call fails. */
  undo: () => void;
  /** The real request, run only after the undo window passes. */
  commit: () => Promise<TResult>;
  /** Immediate toast while Undo is offered. */
  appliedMessage?: string;
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string | ((error: unknown) => string);
}

interface Pending {
  timer: ReturnType<typeof setTimeout>;
  undo: () => void;
  toastId: string;
}

/**
 * Delayed-commit undo pattern: show the change now, offer Undo for
 * `windowMs`, and only call the API if the window elapses. If the call
 * fails, the optimistic change is reverted and an error toast explains it.
 * Suitable for reversible actions (queue start/complete), not money.
 */
export function useDeferredAction(windowMs = 5000) {
  const pending = useRef(new Map<string, Pending>());

  const cancel = useCallback((id: string) => {
    const entry = pending.current.get(id);
    if (!entry) return false;
    clearTimeout(entry.timer);
    pending.current.delete(id);
    return true;
  }, []);

  const undo = useCallback(
    (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      cancel(id);
      entry.undo();
      toast.dismiss(entry.toastId);
      toast.info('Action undone.');
    },
    [cancel],
  );

  const run = useCallback(
    (action: DeferredAction) => {
      // Replacing an action on the same row reverts the previous optimistic
      // change first, so the cache never keeps a half-applied state.
      const previous = pending.current.get(action.id);
      if (previous) {
        clearTimeout(previous.timer);
        previous.undo();
        toast.dismiss(previous.toastId);
      }

      action.apply();
      const toastId = toast.info(action.appliedMessage ?? 'Applied.', {
        duration: windowMs,
        action: { label: 'Undo', onClick: () => undo(action.id) },
      });

      const timer = setTimeout(() => {
        pending.current.delete(action.id);
        void (async () => {
          try {
            const result = await action.commit();
            if (typeof action.successMessage === 'function') toast.success(action.successMessage(result));
            else if (action.successMessage) toast.success(action.successMessage);
          } catch (error) {
            action.undo();
            const message =
              typeof action.errorMessage === 'function'
                ? action.errorMessage(error)
                : action.errorMessage ?? (error instanceof Error ? error.message : 'The change could not be saved.');
            toast.error(message);
          }
        })();
      }, windowMs);

      pending.current.set(action.id, { timer, undo: action.undo, toastId });
    },
    [undo, windowMs],
  );

  useEffect(() => {
    const entries = pending.current;
    return () => {
      // A pending action never reached the API; revert its optimistic UI
      // instead of leaving the cache claiming a change that didn't happen.
      for (const entry of entries.values()) {
        clearTimeout(entry.timer);
        entry.undo();
      }
      entries.clear();
    };
  }, []);

  return { run, undo, hasPending: (id?: string) => (id ? pending.current.has(id) : pending.current.size > 0) };
}
