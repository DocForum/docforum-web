import { useEffect, useMemo, useState } from 'react';
import type { WaitlistOffer } from '../../../types/models';
import {
  formatRemaining,
  isUrgent,
  remainingMs,
  serverClockOffsetMs,
} from '../offer-clock';

interface Countdown {
  remaining: number;
  label: string;
  expired: boolean;
  urgent: boolean;
}

/** One-second tick against server-anchored expiry. The interval stops once
 * the offer expires — there is nothing left to count. */
export function useOfferCountdown(offer: Pick<WaitlistOffer, 'expiresAt' | 'serverNow'>): Countdown {
  // Re-anchor only when the payload changes, not on every render.
  const offset = useMemo(
    () => serverClockOffsetMs(offer.serverNow),
    [offer.serverNow],
  );
  const compute = () => remainingMs(offer.expiresAt, offset);

  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute);
    if (compute() <= 0) return;

    const timer = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) clearInterval(timer);
    }, 1_000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `compute` is derived from these two values
  }, [offer.expiresAt, offset]);

  return {
    remaining,
    label: formatRemaining(remaining),
    expired: remaining <= 0,
    urgent: isUrgent(remaining),
  };
}
