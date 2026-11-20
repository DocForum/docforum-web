import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useT } from '../i18n/useT';
import { useToastStore, type Toast } from '../store/toast-store';
import styles from './Toast.module.css';

/**
 * Accessible toast region (issue #113), mounted once in `App.tsx`.
 *
 * - Two permanently mounted live regions: `role="status"` (polite) for
 *   info/success and `role="alert"` (assertive) for errors. Mounting a live
 *   region on demand is unreliable across screen readers, so only the
 *   toasts inside them come and go.
 * - Focus-safe: a toast never moves focus. Its buttons are reachable with
 *   Tab like any other control (the region sits at the end of the DOM).
 * - Dismissible with its close button, or Escape while focus is inside it.
 * - Auto-dismisses after its duration; the timer pauses while the toast is
 *   hovered or has focus, and resumes with the remaining time.
 *
 * Toasts are for background results. A form's own error must still be shown
 * next to the form — a toast is never the only place it appears.
 */
export function ToastRegion() {
  const toasts = useToastStore((state) => state.toasts);
  const polite = toasts.filter((toast) => toast.tone !== 'error');
  const assertive = toasts.filter((toast) => toast.tone === 'error');

  return (
    <div className={styles.viewport}>
      <div role="status" aria-live="polite" aria-relevant="additions" className={styles.stack}>
        {polite.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
      <div role="alert" aria-live="assertive" aria-relevant="additions" className={styles.stack}>
        {assertive.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const t = useT();
  const dismiss = useToastStore((state) => state.dismiss);
  const remaining = useRef(toast.durationMs);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef(false);
  const focused = useRef(false);

  const close = useCallback(() => dismiss(toast.id), [dismiss, toast.id]);

  const pause = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    if (remaining.current !== null) {
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    }
  }, []);

  const resume = useCallback(() => {
    if (timer.current !== null || remaining.current === null) return;
    if (hovered.current || focused.current) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(close, remaining.current);
  }, [close]);

  useEffect(() => {
    resume();
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [resume]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.tone]}`}
      data-testid="toast"
      onMouseEnter={() => {
        hovered.current = true;
        pause();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        resume();
      }}
      onFocus={() => {
        focused.current = true;
        pause();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        focused.current = false;
        resume();
      }}
      onKeyDown={onKeyDown}
    >
      <p className={styles.message}>{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onAction();
            close();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className={styles.close}
        aria-label={t('toast.dismiss', 'Dismiss notification')}
        onClick={close}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
