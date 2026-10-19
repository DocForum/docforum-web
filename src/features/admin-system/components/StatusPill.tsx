import type { Tone } from '../status';
import styles from './SystemHealth.module.css';

/** Colour backs up the label, never replaces it. */
export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={styles.pill} data-tone={tone}>
      <span className={styles.pillDot} aria-hidden="true" />
      {label}
    </span>
  );
}
