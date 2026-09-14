import { useEffect, useState } from 'react';

/**
 * Returns true once `isPending` has been true for longer than `delayMs`.
 *
 * Exists for one specific, real reason: docforum-core's Render deployment
 * is a free-tier preview that spins down after 15 minutes idle (see
 * docforum-core's docs/adr/0003-render-preview-deployment.md) — the first
 * request after that can take up to ~a minute to get a cold-started
 * response. Without this, a normal few-hundred-ms request and a
 * minute-long cold start look identical to the user: a spinner with no
 * explanation. Past `delayMs` we tell them what's actually happening
 * instead of letting them assume it's broken.
 */
export function useSlowRequestHint(isPending: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isPending, delayMs]);

  return slow;
}
