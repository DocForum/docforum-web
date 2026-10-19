import { useEffect, useId, useRef, useState } from 'react';
import { useToastStore } from '../store/toast-store';
import type { Toast as ToastData } from '../store/toast-store';
import styles from './Toast.module.css';

const TONE_CLASS = {
  success: styles.success,
  error: styles.error,
  info: styles.info,
};

function ToastItem({ toast }: { toast: ToastData }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const [paused, setPaused] = useState(false);
  const titleId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused || toast.duration <= 0) return;
    timer.current = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [dismiss, paused, toast.duration, toast.id]);

  // Keep the timer paused while focus moves between the toast's own buttons.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPaused(false);
  };

  return (
    <div
      className={`${styles.toast} ${TONE_CLASS[toast.tone]}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-labelledby={titleId}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={handleBlur}
    >
      <p id={titleId} className={styles.message}>
        {toast.message}
      </p>
      <div className={styles.actions}>
        {toast.action && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              toast.action?.onClick();
              dismiss(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}

/** Fixed toast viewport. `aria-live` on the region announces each toast
 * without moving focus; errors additionally use `role="alert"`. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
