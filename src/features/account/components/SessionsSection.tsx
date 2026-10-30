import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import type { ActiveSession } from '../../../types/models';
import {
  SESSIONS_QUERY_KEY,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '../hooks/useSessions';
import styles from './SessionsSection.module.css';

type PendingAction = { kind: 'one'; session: ActiveSession } | { kind: 'others' };

function formatLastActive(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/**
 * Active sessions and devices (issue #79). Lists the user's sessions with
 * coarse device/location only (never an IP), lets them sign one out or every
 * other one, and treats revoking the current session as a real sign-out.
 */
export function SessionsSection() {
  const { data: sessions, isLoading, isError, refetch, isFetching } = useSessions();
  const revokeSessionMutation = useRevokeSession();
  const revokeOthersMutation = useRevokeOtherSessions();
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const otherSessions = (sessions ?? []).filter((session) => !session.isCurrent);
  const isBusy = revokeSessionMutation.isPending || revokeOthersMutation.isPending;

  async function confirm() {
    if (!pending) return;
    setNotice(null);

    try {
      if (pending.kind === 'one') {
        await revokeSessionMutation.mutateAsync(pending.session.id);
        if (pending.session.isCurrent) {
          // Revoking this device is a sign-out: clear every piece of client
          // state (server cache included), not just the token.
          queryClient.clear();
          clearSession();
          setPending(null);
          navigate('/login', { replace: true });
          return;
        }
        setNotice(`Signed out ${pending.session.device}.`);
      } else {
        const result = await revokeOthersMutation.mutateAsync();
        setNotice(
          result.revokedCount === 1
            ? 'Signed out 1 other session.'
            : `Signed out ${result.revokedCount} other sessions.`,
        );
      }
      setPending(null);
    } catch (error) {
      // A session revoked elsewhere is not an error — it is already gone.
      if (error instanceof ApiError && error.status === 404) {
        if (pending.kind === 'one') {
          queryClient.setQueryData<ActiveSession[]>(SESSIONS_QUERY_KEY, (list) =>
            list ? list.filter((session) => session.id !== pending.session.id) : list,
          );
        }
        setNotice('That session was already signed out.');
        setPending(null);
        void refetch();
        return;
      }
      setPending(null);
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not sign that session out. Please try again.',
      );
    }
  }

  return (
    <section className={styles.section} aria-labelledby="sessions-heading">
      <div className={styles.header}>
        <div>
          <h2 id="sessions-heading" className={styles.title}>
            Active sessions
          </h2>
          <p className={styles.description}>
            Devices currently signed in to your account. Sign out anything you no longer use — for
            example, a clinic kiosk you forgot to log out of.
          </p>
        </div>
      </div>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {isLoading ? (
        <p className={styles.loading} role="status">
          <Spinner size={14} /> Loading your sessions…
        </p>
      ) : isError ? (
        <div className={styles.error} role="alert">
          <p>We couldn’t load your sessions.</p>
          <Button variant="secondary" size="small" onClick={() => void refetch()} loading={isFetching}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {(sessions ?? []).map((session) => (
              <li key={session.id} className={styles.session}>
                <div className={styles.sessionDetails}>
                  <p className={styles.device}>
                    {session.device}
                    {session.isCurrent && <span className={styles.currentBadge}>This device</span>}
                  </p>
                  <p className={styles.meta}>
                    {session.approximateLocation ?? 'Location unavailable'} · Last active{' '}
                    {formatLastActive(session.lastActiveAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setPending({ kind: 'one', session })}
                >
                  {session.isCurrent ? 'Sign out this device' : 'Sign out'}
                </Button>
              </li>
            ))}
          </ul>

          {otherSessions.length === 0 ? (
            <p className={styles.empty}>No other devices are signed in.</p>
          ) : (
            <Button variant="danger" onClick={() => setPending({ kind: 'others' })}>
              Sign out everywhere else
            </Button>
          )}
        </>
      )}

      {pending && (
        <div className={styles.backdrop}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-confirm-heading"
          >
            <h3 id="session-confirm-heading" className={styles.dialogTitle}>
              {pending.kind === 'one'
                ? pending.session.isCurrent
                  ? 'Sign out this device?'
                  : `Sign out ${pending.session.device}?`
                : 'Sign out all other devices?'}
            </h3>
            <p className={styles.dialogBody}>
              {pending.kind === 'one' && pending.session.isCurrent
                ? 'You will be logged out of DocForum on this device and will need to log in again.'
                : 'That device will need to log in again. Your current session stays signed in.'}
            </p>
            <div className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={() => setPending(null)}
                disabled={isBusy}
                autoFocus
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void confirm()} loading={isBusy}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
