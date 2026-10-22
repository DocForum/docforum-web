import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { Dialog } from '../../../components/Dialog';
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
  const [emailError, setEmailError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(undefined);

    // Guard: Owner-only action check
    if (!isOwner) {
      setError('Unauthorized: Only facility owners can invite team members.');
      return;
    }

    if (!email || !email.includes('@')) {
      const message = 'Please provide a valid email address.';
      setEmailError(message);
      setError(message);
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
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="invite-title"
      describedBy="invite-description"
      overlayClassName={styles.modalOverlay}
      panelClassName={styles.modalContent}
    >
      <h3 id="invite-title">Invite team member</h3>
      <p id="invite-description" className={styles.modalDescription}>
        Send an invitation email to a staff pharmacist or co-owner. They will receive a link to activate their account and join this facility.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@pharmacy.org"
          required
          error={emailError}
          autoComplete="email"
        />

        <div>
          <label htmlFor="member-role" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
            Role
          </label>
          <select
            id="member-role"
            value={role}
            onChange={(e) => setRole(e.target.value as FacilityMemberRole)}
            aria-describedby="member-role-hint"
            className={styles.roleSelect}
            style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%' }}
          >
            <option value="staff">Staff (Fulfillment, dispensing, read-only team)</option>
            <option value="owner">Owner (Full administrative rights, billing, team management)</option>
          </select>
          <span id="member-role-hint" className="srOnly">
            Owners can invite and remove staff. Staff have fulfillment access only.
          </span>
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
    </Dialog>
  );
}
