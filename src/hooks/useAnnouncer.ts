import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Default batching window. Live queues refetch on an interval and can
 * change several rows at once; announcing each row would flood a screen
 * reader. Rapid messages are collected and announced once per window.
 */
export const ANNOUNCEMENT_BATCH_MS = 800;

export interface Announcer {
  /** Latest batched message, safe to render inside a polite live region. */
  message: string;
  /** Queue a message; multiple calls inside the window are merged. */
  announce: (text: string) => void;
  /** Drop the pending batch and clear the region. */
  reset: () => void;
}

export function useAnnouncer(batchMs: number = ANNOUNCEMENT_BATCH_MS): Announcer {
  const [message, setMessage] = useState('');
  const pending = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const unique = Array.from(new Set(pending.current.filter(Boolean)));
    pending.current = [];
    if (unique.length > 0) setMessage(unique.join(' '));
  }, []);

  const announce = useCallback(
    (text: string) => {
      if (!text) return;
      pending.current.push(text);
      if (timer.current) return;
      timer.current = setTimeout(flush, batchMs);
    },
    [batchMs, flush],
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = [];
    setMessage('');
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, announce, reset };
}
