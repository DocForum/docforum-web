import { useState } from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { Button } from '../../../components/Button';
import { ResendVerificationButton } from './ResendVerificationButton';
import styles from './EmailVerificationBanner.module.css';

export function EmailVerificationBanner() {
  const user = useAuthStore((state) => state.user);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerifiedAt !== null || dismissed) return null;

  return (
    <aside className={styles.banner} aria-label="Email verification">
      <div>
        <strong>Verify your email address</strong>
        <p>Verify your email to use all DocForum features.</p>
        <ResendVerificationButton />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="small"
        aria-label="Dismiss email verification notice"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </Button>
    </aside>
  );
}
