import styles from './Spinner.module.css';

// Functional motion, not decorative — indeterminate-progress spinners are
// generally exempt from "restrained motion" defaults since they communicate
// real state. Still slows under prefers-reduced-motion rather than being
// static, since a frozen spinner reads as broken, not calm.
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className={styles.spinner}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
