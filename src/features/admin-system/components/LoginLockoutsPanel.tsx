import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { TextField } from '../../../components/TextField';
import { ApiError } from '../../../services/api-client';
import { useClearLoginAttempts } from '../hooks/useSystemHealth';
import { StatusPill } from './StatusPill';
import type { Tone } from '../status';
import styles from './SystemHealth.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Outcome {
  tone: Tone;
  title: string;
  detail: string;
}

/**
 * Admin escape hatch for a login lock (issue #275, docforum-core Phase 8
 * #35). docforum-core does not accept a free-text reason — it records the
 * clear and the acting admin in its own audit trail — so this panel does not
 * ask for one it cannot send.
 */
function describeClearError(error: unknown): Outcome {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        tone: 'danger',
        title: 'Not allowed',
        detail: 'Your session does not have admin access. Sign in again with an admin account.',
      };
    }
    if (error.status === 400) {
      return {
        tone: 'warning',
        title: 'Check the email',
        detail: 'docforum-core rejected that email address. Enter the address the user signs in with.',
      };
    }
    if (error.status === 404) {
      return {
        tone: 'warning',
        title: 'Not served yet',
        detail: "docforum-core doesn't serve login-lockout clearing yet.",
      };
    }
    if (error.status === 429) {
      return {
        tone: 'warning',
        title: 'Too many requests',
        detail: 'Wait a moment, then try again.',
      };
    }
    return {
      tone: 'danger',
      title: 'Lockout not cleared',
      detail: `docforum-core refused the request (${error.status}).`,
    };
  }
  return {
    tone: 'warning',
    title: "Couldn't confirm",
    detail:
      'docforum-core did not answer, so the lockout may or may not have been cleared. Check the audit trail before retrying.',
  };
}

export function LoginLockoutsPanel() {
  const titleId = useId();
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const clear = useClearLoginAttempts();

  const normalizedEmail = email.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFieldError('Enter the email address the user signs in with.');
      return;
    }
    setFieldError(null);
    setOutcome(null);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    try {
      const result = await clear.mutateAsync(normalizedEmail);
      setConfirmOpen(false);
      setOutcome(
        result.cleared > 0
          ? {
              tone: 'ok',
              title: 'Lockout cleared',
              detail: `docforum-core cleared ${result.cleared} failed sign-in ${
                result.cleared === 1 ? 'attempt' : 'attempts'
              }. That email can try signing in again now.`,
            }
          : {
              tone: 'neutral',
              title: 'No lockout found',
              detail: 'There was no active lockout for that email, so nothing changed.',
            },
      );
    } catch (error) {
      setConfirmOpen(false);
      setOutcome(describeClearError(error));
    }
  };

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <div>
          <h2 id={titleId} className={styles.panelTitle}>
            Login lockouts
          </h2>
          <p className={styles.panelHint}>
            A legitimate user locked out after repeated failed sign-ins can be released here
            without waiting out the lock.
          </p>
        </div>
      </div>

      <form className={styles.lockoutForm} onSubmit={submit} noValidate>
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          error={fieldError ?? undefined}
          hint="The address the user signs in with."
          autoComplete="email"
          spellCheck={false}
          disabled={clear.isPending}
        />
        <Button type="submit" disabled={clear.isPending}>
          Clear lockout
        </Button>
      </form>

      <p className={styles.lockoutNote}>
        Only the sign-in throttle is cleared — the password is unchanged, and a deactivated account
        stays deactivated. docforum-core records the clear in its audit trail under your admin
        account.
      </p>

      {outcome ? (
        <div className={styles.result} data-tone={outcome.tone} role="status">
          <StatusPill tone={outcome.tone} label={outcome.title} />
          <p>{outcome.detail}</p>
        </div>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!clear.isPending) setConfirmOpen(false);
        }}
        labelledBy={dialogTitleId}
        describedBy={dialogDescriptionId}
        overlayClassName={styles.overlay}
        panelClassName={styles.dialog}
      >
        <h2 id={dialogTitleId} className={styles.dialogTitle}>
          Clear the login lockout for {normalizedEmail}?
        </h2>
        <div id={dialogDescriptionId} className={styles.dialogDescription}>
          <p>
            This releases the sign-in throttle for this email so the user can try again
            immediately. It does not change their password or reactivate a deactivated account.
          </p>
          <p className={styles.dialogNote}>
            docforum-core records who cleared the lockout and when in the audit trail.
          </p>
        </div>
        <div className={styles.dialogActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={clear.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirm()} loading={clear.isPending}>
            Clear lockout
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
