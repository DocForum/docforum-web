import { useEffect, useRef, useState } from 'react';
import styles from './LockoutNotice.module.css';

/** Seconds at which the countdown is re-announced to screen readers. */
const ANNOUNCE_AT = new Set([60, 30, 10, 5, 4, 3, 2, 1]);

function countdownMessage(seconds: number): string {
  return `Too many attempts. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
}

export interface LockoutNoticeProps {
  secondsRemaining: number;
}

/**
 * Lockout message for login/signup (issue #80).
 *
 * The visible number updates every second, but it is intentionally not a live
 * region — announcing each tick is noise. A visually hidden polite region
 * re-announces at sensible intervals instead (immediately, then 60/30/10/5…1),
 * so the countdown is usable without sight and without a stream of alerts.
 *
 * The wording is deliberately account-agnostic: it must not reveal whether the
 * submitted email exists.
 */
export function LockoutNotice({ secondsRemaining }: LockoutNoticeProps) {
  const [announcement, setAnnouncement] = useState('');
  const announcedOnce = useRef(false);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      if (announcedOnce.current) setAnnouncement('You can try again now.');
      return;
    }
    if (!announcedOnce.current || ANNOUNCE_AT.has(secondsRemaining)) {
      announcedOnce.current = true;
      setAnnouncement(countdownMessage(secondsRemaining));
    }
  }, [secondsRemaining]);

  return (
    <>
      <p className={styles.notice} data-testid="lockout-notice">
        {countdownMessage(secondsRemaining)}
      </p>
      <p className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  );
}
