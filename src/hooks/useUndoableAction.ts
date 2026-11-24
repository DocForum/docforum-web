// Undo for easily mis-clicked, reversible actions (issue #113).
//
// Delayed commit: the change is applied locally at once, a toast offers
// "Undo" for `delayMs`, and only then is the server call made. Undo reverts
// the local change and nothing is ever sent. Used where the API has no
// compensating call (e.g. there is no "mark unread" endpoint).
//
// Same eligibility rules as `useOptimisticMutation`: never for money
// movement.
import { useCallback, useEffect, useRef, useState } from 'react';
import { dismissToast, showToast } from '../store/toast-store';

export const UNDO_WINDOW_MS = 6_000;

export interface UndoableActionOptions {
  /** Toast copy while the action can still be undone. */
  message: string;
  undoLabel: string;
  /** Polite confirmation after Undo. */
  undoneMessage: string;
  /** Error toast if the delayed commit fails (the change is reverted). */
  errorMessage: string;
  /** Apply the change locally; return how to revert it. */
  apply: () => (() => void) | void;
  /** The real server call, made once the undo window closes. */
  commit: () => Promise<unknown>;
  onCommitted?: () => void;
  delayMs?: number;
}

interface Pending {
  timer: ReturnType<typeof setTimeout>;
  toastId: string;
  revert?: () => void;
  options: UndoableActionOptions;
}

export interface UndoableAction {
  run: (options: UndoableActionOptions) => void;
  /** True from `run` until the commit settles or the action is undone. */
  isPending: boolean;
}

export function useUndoableAction(): UndoableAction {
  const pending = useRef<Pending | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const mounted = useRef(true);

  const track = useCallback((delta: number) => {
    if (mounted.current) setInFlight((count) => Math.max(0, count + delta));
  }, []);

  const commitNow = useCallback(
    (entry: Pending) => {
      clearTimeout(entry.timer);
      dismissToast(entry.toastId);
      if (pending.current === entry) pending.current = null;
      void entry.options
        .commit()
        .then(() => entry.options.onCommitted?.())
        .catch(() => {
          entry.revert?.();
          showToast({ tone: 'error', message: entry.options.errorMessage });
        })
        .finally(() => track(-1));
    },
    [track],
  );

  const run = useCallback(
    (options: UndoableActionOptions) => {
      // One pending action at a time: a second one commits the first.
      if (pending.current) commitNow(pending.current);

      const revert = options.apply() ?? undefined;
      track(1);
      const entry: Pending = {
        options,
        revert,
        toastId: '',
        timer: setTimeout(() => commitNow(entry), options.delayMs ?? UNDO_WINDOW_MS),
      };
      entry.toastId = showToast({
        tone: 'info',
        message: options.message,
        // The toast outlives the window slightly; the commit dismisses it.
        durationMs: null,
        action: {
          label: options.undoLabel,
          onAction: () => {
            if (pending.current !== entry) return;
            clearTimeout(entry.timer);
            pending.current = null;
            dismissToast(entry.toastId);
            entry.revert?.();
            track(-1);
            showToast({ tone: 'success', message: options.undoneMessage });
          },
        },
      });
      pending.current = entry;
    },
    [commitNow, track],
  );

  // Leaving the screen (or the page) must not silently drop the user's
  // action: commit whatever is still pending instead.
  useEffect(() => {
    mounted.current = true;
    const flush = () => {
      if (pending.current) commitNow(pending.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
      mounted.current = false;
    };
  }, [commitNow]);

  return { run, isPending: inFlight > 0 };
}
