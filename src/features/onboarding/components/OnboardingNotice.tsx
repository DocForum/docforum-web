import styles from './OnboardingNotice.module.css';

/** Non-blocking status line for when the setup summary cannot be loaded.
 * Never hides or disables the rest of the dashboard. */
export function OnboardingNotice({ children }: { children: string }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}
