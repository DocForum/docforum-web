import { useCallback, useEffect, useState } from 'react';

export interface RetryAfterCountdown {
  /** Whole seconds until the action is allowed again (0 when unlocked). */
  secondsRemaining: number;
  isLockedOut: boolean;
  /** Start (or restart) a lockout of `seconds`, measured from now. */
  start: (seconds: number) => void;
  reset: () => void;
}

/**
 * A second-by-second countdown driven by an absolute deadline rather than a
 * decrementing counter, so a backgrounded tab still shows the true remaining
 * time when it comes back (issue #80).
 */
export function useRetryAfterCountdown(): RetryAfterCountdown {
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (retryAt === null) {
      setSecondsRemaining(0);
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) setRetryAt(null);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [retryAt]);

  const start = useCallback((seconds: number) => {
    setRetryAt(Date.now() + Math.max(0, seconds) * 1000);
  }, []);

  const reset = useCallback(() => {
    setRetryAt(null);
    setSecondsRemaining(0);
  }, []);

  return { secondsRemaining, isLockedOut: secondsRemaining > 0, start, reset };
}
