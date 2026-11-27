import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { ApiError } from '../../../services/api-client';
import type { AdminUser } from '../../../types/models';
import { useDeactivateAdminUser, useReactivateAdminUser } from '../hooks/useAdminUsers';
import { isLastAdminError, validateDeactivationReason } from '../query';
import styles from './AdminUsers.module.css';
import { formatInstant } from '../../../i18n/format';

interface AdminUserDialogProps {
  user: AdminUser;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : formatInstant(date, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * User detail (issue #70): role, status, live session count, and the
 * deactivate/reactivate action. Deactivation is destructive, so it needs a
 * written reason (10–500 characters, kept for the audit trail) and states what
 * happens to the user's sessions. The last-active-admin conflict is surfaced
 * as its own explanation, not as a generic failure.
 */
export function AdminUserDialog({ user, onClose }: AdminUserDialogProps) {
  const headingId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const deactivate = useDeactivateAdminUser(user.id);
  const reactivate = useReactivateAdminUser(user.id);

  const failure = deactivate.error ?? reactivate.error;

  function handleDeactivate() {
    if (deactivate.isPending) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const result = validateDeactivationReason(reason);
    if ('error' in result) {
      setReasonError(result.error);
      return;
    }
    setReasonError(null);
    deactivate.mutate({ reason: result.reason }, { onSuccess: onClose });
  }

  return (
    <Dialog open onClose={onClose} labelledBy={headingId}>
      <div className={styles.panel}>
        <h2 id={headingId} className={styles.panelTitle}>
          {user.fullName}
        </h2>

        <dl className={styles.detailList}>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd className={styles.capitalise}>{user.role}</dd>
          <dt>Status</dt>
          <dd>
            <span className={user.status === 'active' ? styles.statusActive : styles.statusOff}>
              {user.status === 'active' ? 'Active' : 'Deactivated'}
            </span>
          </dd>
          <dt>Signed-in sessions</dt>
          <dd>{user.activeSessionCount}</dd>
          <dt>Created</dt>
          <dd>{formatDate(user.createdAt)}</dd>
          <dt>Last active</dt>
          <dd>{formatDate(user.lastActiveAt)}</dd>
          {user.status === 'deactivated' && (
            <>
              <dt>Deactivated</dt>
              <dd>{formatDate(user.deactivatedAt)}</dd>
              <dt>Reason on record</dt>
              <dd>{user.deactivationReason ?? '—'}</dd>
            </>
          )}
        </dl>

        {user.status === 'active' ? (
          <div className={styles.actionBlock}>
            <p className={styles.notice}>
              Deactivating this account ends its {user.activeSessionCount} active{' '}
              {user.activeSessionCount === 1 ? 'session' : 'sessions'} immediately. The person will not be able to
              sign in, but their records are kept.
            </p>
            <label htmlFor={reasonId} className={styles.label}>
              Why are you deactivating this account?
            </label>
            <textarea
              id={reasonId}
              className={styles.textarea}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              placeholder="For example: account compromised, or staff member has left."
              aria-describedby={reasonError ? `${reasonId}-error` : undefined}
            />
            <p className={styles.hint}>10–500 characters. Admins can see this in the audit trail.</p>
            {reasonError && (
              <p id={`${reasonId}-error`} className={styles.error} role="alert">
                {reasonError}
              </p>
            )}
            <div className={styles.panelActions}>
              <Button variant="secondary" onClick={onClose} disabled={deactivate.isPending}>
                Keep account active
              </Button>
              <Button
                variant="danger"
                onClick={handleDeactivate}
                loading={deactivate.isPending}
                disabled={!reason.trim()}
              >
                {confirming ? 'Confirm deactivation' : 'Deactivate account'}
              </Button>
            </div>
            {confirming && (
              <p className={styles.confirmNote} role="status">
                Press <strong>Confirm deactivation</strong> to end the account&apos;s sessions. This cannot be undone
                from this screen without reactivating it.
              </p>
            )}
          </div>
        ) : (
          <div className={styles.actionBlock}>
            <p className={styles.notice}>
              Reactivating restores the account. The person will need to sign in again; their previous sessions
              stay ended.
            </p>
            <div className={styles.panelActions}>
              <Button variant="secondary" onClick={onClose} disabled={reactivate.isPending}>
                Close
              </Button>
              <Button
                onClick={() => reactivate.mutate(undefined, { onSuccess: onClose })}
                loading={reactivate.isPending}
              >
                Reactivate account
              </Button>
            </div>
          </div>
        )}

        {failure && (
          <p className={styles.error} role="alert">
            {isLastAdminError(failure)
              ? "This is the last active admin, so this account can't be deactivated. Invite or reactivate another admin first, then try again."
              : failure instanceof ApiError && failure.status === 409
                ? 'This account changed since it was loaded. Close this dialog and reopen it to see the latest details.'
                : "That didn't go through, so nothing has changed. Please try again."}
          </p>
        )}
      </div>
    </Dialog>
  );
}
