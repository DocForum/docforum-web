import { Button } from './Button';
import styles from './SessionTimeoutWarning.module.css';

export interface SessionTimeoutWarningProps {
  open: boolean;
  /** Whole seconds until the automatic sign-out. */
  secondsRemaining: number;
  /** True when any mounted form holds unsaved input. */
  unsavedChanges: boolean;
  onStaySignedIn: () => void;
  onSignOutNow: () => void;
}

/**
 * Pre-timeout warning for shared clinical devices (issue #82). Shown for a
 * short window before the automatic sign-out so nobody loses a form they
 * are mid-way through typing — "Stay signed in" resets the idle clock.
 */
export function SessionTimeoutWarning({
  open,
  secondsRemaining,
  unsavedChanges,
  onStaySignedIn,
  onSignOutNow,
}: SessionTimeoutWarningProps) {
  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-timeout-title"
        aria-describedby="idle-timeout-body"
      >
        <h2 id="idle-timeout-title" className={styles.title}>
          Still there?
        </h2>
        <p id="idle-timeout-body" className={styles.body}>
          You’ll be signed out in <strong>{secondsRemaining} seconds</strong> because this device
          has been inactive. Shared devices sign out automatically to protect patient records.
        </p>
        {unsavedChanges && (
          <p className={styles.unsaved} role="status">
            You have unsaved changes — anything you haven’t saved will be lost when you’re signed
            out.
          </p>
        )}
        <div className={styles.actions}>
          <Button autoFocus onClick={onStaySignedIn}>
            Stay signed in
          </Button>
          <Button variant="secondary" onClick={onSignOutNow}>
            Sign out now
          </Button>
        </div>
      </div>
    </div>
  );
}
