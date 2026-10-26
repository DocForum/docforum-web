import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import type { FacilityMemberRole, InviteMemberInput } from '../../../types/models';
import styles from './FacilityTeam.module.css';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (input: InviteMemberInput) => Promise<unknown>;
  isPending: boolean;
  isOwner: boolean;
}

export function InviteMemberModal({
  open,
  onClose,
  onInvite,
  isPending,
  isOwner,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FacilityMemberRole>('staff');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Guard: Owner-only action check
    if (!isOwner) {
      setError('Unauthorized: Only facility owners can invite team members.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    try {
      await onInvite({ email, role });
      setEmail('');
      setRole('staff');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to send invitation');
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <div className={styles.modalContent}>
        <h3 id="invite-title">Invite team member</h3>
        <p className={styles.modalDescription}>
          Send an invitation email to a staff pharmacist or co-owner. They will receive a link to activate their account and join this facility.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@pharmacy.org"
            required
            autoFocus
          />

          <div>
            <label htmlFor="member-role" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
              Role
            </label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as FacilityMemberRole)}
              className={styles.dataTable}
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%' }}
            >
              <option value="staff">Staff (Fulfillment, dispensing, read-only team)</option>
              <option value="owner">Owner (Full administrative rights, billing, team management)</option>
            </select>
          </div>

          {error && <FormError message={error} />}

          <div className={styles.modalActions}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isPending ? 'Sending invite…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
