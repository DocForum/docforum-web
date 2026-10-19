import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { errorMessage } from './errors';
import { useAdminUser, useDeactivateUser, useReactivateUser } from './hooks';

interface UserDetailPanelProps {
  userId: string;
  onClose: () => void;
}

export function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const { data: user, isLoading, isError } = useAdminUser(userId);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p>Loading user…</p>;
  if (isError || !user) return <p role="alert">Could not load this user.</p>;

  const isActive = user.status === 'active';
  const trimmed = reason.trim();

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isActive) {
        await deactivate.mutateAsync({ id: user.id, reason: trimmed });
      } else {
        await reactivate.mutateAsync({ id: user.id, reason: trimmed });
      }
      setReason('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section className="au-detail" aria-label="User details">
      <header className="au-detail-header">
        <h2>{user.name}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <dl>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Role</dt>
        <dd>{user.role}</dd>
        <dt>Status</dt>
        <dd>{user.status}</dd>
        <dt>Active sessions</dt>
        <dd>{user.sessionsCount}</dd>
        {user.deactivationReason ? (
          <>
            <dt>Deactivation reason</dt>
            <dd>{user.deactivationReason}</dd>
          </>
        ) : null}
      </dl>

      {error ? (
        <p role="alert" className="au-error">
          {error}
        </p>
      ) : null}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) setConfirming(true);
        }}
      >
        <label>
          Reason (required)
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </label>
        <button type="submit" className={isActive ? 'au-danger' : undefined} disabled={!trimmed || busy}>
          {isActive ? 'Deactivate account' : 'Reactivate account'}
        </button>
      </form>

      {confirming ? (
        <ConfirmDialog
          title={isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
          message={
            isActive
              ? `${user.name} will be blocked from signing in. Your reason is recorded.`
              : `${user.name} will be able to sign in again. Your reason is recorded.`
          }
          confirmLabel={isActive ? 'Deactivate' : 'Reactivate'}
          busy={busy}
          onConfirm={run}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </section>
  );
}