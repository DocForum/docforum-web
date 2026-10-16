import { useEffect, useRef } from 'react';
import type { RedFlagResult } from '../../../types/models';
import styles from './RedFlagInterstitial.module.css';

export interface RedFlagInterstitialProps {
  reflags: RedFlagResult;
  /** Local emergency number from config (e.g. 999, 112, 911). */
  emergencyNumber: string;
  /** Called when the patient acknowledges and wants to continue booking. */
  onAcknowledge: () => void;
  /** Called when the patient chooses to seek urgent care now. */
  onSeekUrgentCare: () => void;
  /** Optional: true while the acknowledgement is in flight. */
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

/**
 * Full-screen safety interstitial shown when the intake API returns
 * `redFlags.matched = true`. It never auto-dismisses, uses an assertive
 * live region for screen readers, and respects reduced-motion preferences
 * (animations are CSS-only and gated behind `@media (prefers-reduced-motion)` in
 * the module sheet).
 */
export function RedFlagInterstitial({
  redflags,
  emergencyNumber,
  onAcknowledge,
  onSeekUrgentCare,
  isSubmitting = false,
  errorMessage = null,
}: RedFlagInterstitialProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Move focus to the primary (safe) action on mount so keyboard and
  // screen-reader users are placed on the safe path first.
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  const telHref = `tel:${emergencyNumber}.replace(/[^\d+]/g, '')}`;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelled="redflag-interstitial-title"
      aria-describedby="redflag-interstitial-description"
    >
      <div className={styles.panel}>
        <div className={styles.badge}>Safety check</div>

        <h1 id="redflag-interstitial-title" className={styles.title}>
          Please get urgent help before booking
        </h1>

        <p id="redflag-interstitial-description" className={styles.lead}>
          What you've told us may need care right away. A routine appointment
          later could be too slow. This isn't a diagnosis — it's a check to keep
          you safe.
        </p>

        <div className={styles.callout} role="alert" aria-live="assertive">
          <p className={styles.calloutLine}>
            Call <strong>{emergencyNumber}</strong> now, or go to your nearest
            emergency department.
          </p>
          <a className={styles.callLink} href={telHref}>
            Call {emergencyNumber}
          </a>
        </div>

        <section className={styles.reasons} aria-labelled="redflag-reasons">
          <h2 className={styles.reasonsTitle}>What we noticed</h2>
          <ul className={styles.reasonList}>
            {redflags.reasons.map((reason) => (
              <li key={reason.code} className={styles.reasonItem}>
                <span className={styles.reasonLabel}>{reason.label}</span>
                {reason.detail ? (
                  <span className={styles.reasonDetail}>{` — ${reason.detail}`}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            ref={primaryRef}
            type="button"
            className={styles.primaryButton}
            onClick={onSeekUrgentCare}
            disabled={isSubmitting}
          >
            I’ll seek urgent care now
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onAcknowledge}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Recording acknowledgement…' : 'I understand — continue booking anyway'}
          </button>
        </div>

        <p className={styles.footnote}>
          If you're unsure whether this is an emergency, call {emergencyNumber} and
          they'll help you decide. You can come back and book a routine slot
          after you've been seen.
        </p>
      </div>
    </div>
  );
}
