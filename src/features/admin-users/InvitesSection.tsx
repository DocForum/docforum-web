import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminInvite } from '../../types/admin-users';
import { ConfirmDialog } from './ConfirmDialog';
import { errorMessage } from './errors';
import { useAdminInvites, useRevokeInvite, useSendInvite } from './hooks';
import { isValidEmail, maskEmail } from './utils';

export function InvitesSection() {
  const { data: invites, isLoading, isError } = useAdminInvites();
  const send = useSendInvite();
  const revoke = useRevokeInvite();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toRevoke, setToRevoke] = useState<AdminInvite | null>(null);

  const pending = (invites ?? []).filter((invite) => invite.status === 'pending');

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!isValidEmail(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await send.mutateAsync(value);
      setEmail('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmRevoke = async () => {
    if (!toRevoke) return;
    setBusy(true);
    setError(null);
    try {
      await revoke.mutateAsync(toRevoke.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setToRevoke(null);
    }
  };

  return (
    <section className="au-invites" aria-labelledby="au-invites-title">
      <h2 id="au-invites-title">Admin invites</h2>

      <form className="au-filters" noValidate onSubmit={onSend}>
        <label>
          Invite email
          <input
            type="email"
            value={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          Send invite
        </button>
      </form>

      {error ? (
        <p role="alert" className="au-error">
          {error}
        </p>
      ) : null}

      {isLoading ? <p>Loading invites…</p> : null}
      {isError ? (
        <p role="alert" className="au-error">
          Could not load invites.
        </p>
      ) : null}
      {!isLoading && !isError && pending.length === 0 ? <p>No pending invites.</p> : null}

      {pending.length > 0 ? (
        <ul className="au-list">
          {pending.map((invite) => (
            <li key={invite.id}>
              <span>{maskEmail(invite.email)}</span>
              <span>Sent {new Date(invite.createdAt).toLocaleDateString()}</span>
              <button
                type="button"
                onClick={() => setToRevoke(invite)}
                aria-label={`Revoke invite for ${maskEmail(invite.email)}`}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {toRevoke ? (
        <ConfirmDialog
          title="Revoke this invite?"
          message={`${maskEmail(toRevoke.email)} will no longer be able to use this invite.`}
          confirmLabel="Revoke invite"
          busy={busy}
          onConfirm={confirmRevoke}
          onCancel={() => setToRevoke(null)}
        />
      ) : null}
    </section>
  );
}