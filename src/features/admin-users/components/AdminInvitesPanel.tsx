import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { ApiError } from '../../../services/api-client';
import { useAdminInvites, useRevokeAdminInvite, useSendAdminInvite } from '../hooks/useAdminUsers';
import styles from './AdminUsers.module.css';
import { formatInstant } from '../../../i18n/format';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pending admin invites (issue #70): send, list and revoke. */
export function AdminInvitesPanel() {
  const fieldId = useId();
  const invites = useAdminInvites();
  const send = useSendAdminInvite();
  const revoke = useRevokeAdminInvite();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (send.isPending) return;
    const value = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      setFormError('Enter a valid email address, for example name@example.org.');
      return;
    }
    setFormError(null);
    send.mutate(
      { email: value },
      {
        onSuccess: () => setEmail(''),
        onError: (error) => {
          setFormError(
            error instanceof ApiError && error.status === 409
              ? 'An invite is already pending for that address.'
              : "We couldn't send that invite. Nothing was sent — please try again.",
          );
        },
      },
    );
  }

  return (
    <section className="card" aria-labelledby="admin-invites-heading">
      <h2 id="admin-invites-heading">Invite an admin</h2>
      <p className={styles.muted}>
        Invited people set their own password from the email link. Only admins can invite other admins.
      </p>

      <form className={styles.inviteForm} onSubmit={handleSubmit} noValidate>
        <label htmlFor={fieldId} className={styles.label}>
          Email address
        </label>
        <div className={styles.inviteRow}>
          <input
            id={fieldId}
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormError(null);
            }}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? `${fieldId}-error` : undefined}
            placeholder="name@example.org"
            autoComplete="email"
          />
          <Button type="submit" loading={send.isPending}>
            Send invite
          </Button>
        </div>
        {formError && (
          <p id={`${fieldId}-error`} className={styles.error} role="alert">
            {formError}
          </p>
        )}
      </form>

      {invites.isPending && <Skeleton lines={2} label="Loading pending invites" />}
      {invites.isError && (
        <InlineError
          title="Couldn't load pending invites"
          message="The list of invitations didn't load. Sending a new invite still works."
          onRetry={() => invites.refetch()}
        />
      )}
      {invites.data && invites.data.length === 0 && (
        <p className={styles.muted}>No admin invitations are pending.</p>
      )}
      {invites.data && invites.data.length > 0 && (
        <table className={styles.table}>
          <caption className={styles.srOnly}>Pending admin invitations</caption>
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Invited</th>
              <th scope="col">Expires</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.data.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{formatInstant(invite.invitedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td>{formatInstant(invite.expiresAt, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td>
                  {confirmRevokeId === invite.id ? (
                    <span className={styles.inlineConfirm}>
                      <Button
                        variant="danger"
                        size="small"
                        loading={revoke.isPending}
                        onClick={() =>
                          revoke.mutate(invite.id, { onSettled: () => setConfirmRevokeId(null) })
                        }
                      >
                        Confirm revoke
                      </Button>
                      <Button variant="secondary" size="small" onClick={() => setConfirmRevokeId(null)}>
                        Keep
                      </Button>
                    </span>
                  ) : (
                    <Button variant="secondary" size="small" onClick={() => setConfirmRevokeId(invite.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {revoke.isError && (
        <p className={styles.error} role="alert">
          We couldn&apos;t revoke that invite. It may already have been used — the list will refresh.
        </p>
      )}
    </section>
  );
}
