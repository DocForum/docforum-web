import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Default batching window. Live queues refetch on an interval and can
 * change several rows at once; announcing each row would flood a screen
 * reader. Rapid messages are collected and announced once per window.
 */
export const ANNOUNCEMENT_BATCH_MS = 800;

/**
 * A message, or a function that builds it when the batch flushes. A function
 * lets a caller describe the whole burst (for example "3 new notifications")
 * from state at flush time instead of one message per update; returning an
 * empty string contributes nothing.
 */
export type AnnouncementText = string | (() => string);

export interface Announcer {
  /** Latest batched message, safe to render inside a polite live region. */
  message: string;
  /** Queue a message; multiple calls inside the window are merged. */
  announce: (text: AnnouncementText) => void;
  /** Drop the pending batch and clear the region. */
  reset: () => void;
}

export function useAnnouncer(batchMs: number = ANNOUNCEMENT_BATCH_MS): Announcer {
  const [message, setMessage] = useState('');
  const pending = useRef<AnnouncementText[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const resolved = pending.current.map((item) => (typeof item === 'function' ? item() : item));
    pending.current = [];
    const unique = Array.from(new Set(resolved.filter(Boolean)));
    if (unique.length === 0) return;
    const next = unique.join(' ');
    // A live region only speaks when its text changes. If this batch reads
    // the same as the last one, vary it invisibly so it is still announced.
    setMessage((current) => (current === next ? `${next}\u00a0` : next));
  }, []);

  const announce = useCallback(
    (text: AnnouncementText) => {
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
