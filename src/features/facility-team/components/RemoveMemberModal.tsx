import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import type { FacilityMember } from '../../../types/models';
import styles from './FacilityTeam.module.css';

interface RemoveMemberModalProps {
  member: FacilityMember | null;
  onClose: () => void;
  onConfirm: (memberId: string) => Promise<unknown>;
  isPending: boolean;
  isLastOwner: boolean;
  isOwner: boolean;
}

export function RemoveMemberModal({
  member,
  onClose,
  onConfirm,
  isPending,
  isLastOwner,
  isOwner,
}: RemoveMemberModalProps) {
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleConfirm = async () => {
    setError(null);

    // Guard: Owner-only action
    if (!isOwner) {
      setError('Unauthorized: Only facility owners can remove members.');
      return;
    }

    // Guard: Cannot remove last owner
    if (member.role === 'owner' && isLastOwner) {
      setError('Cannot remove the only facility owner. Transfer ownership or invite another owner before removing this account.');
      return;
    }

    try {
      await onConfirm(member.id);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to remove member');
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="remove-title">
      <div className={styles.modalContent}>
        <h3 id="remove-title">Remove team member</h3>
        <p className={styles.modalDescription}>
          Are you sure you want to remove <strong>{member.fullName}</strong> ({member.email}) from this facility?
        </p>

        <div style={{ background: '#fdf2f2', border: '1px solid #f2b8b5', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#b3261e', fontSize: 'var(--text-xs)' }}>
          <strong>Important security notice:</strong> Removing a member immediately signs them out and revokes all active backend sessions and dispensing permissions for this facility.
        </div>

        {isLastOwner && member.role === 'owner' && (
          <div style={{ background: '#fff8e6', border: '1px solid #ebd08c', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#8c5b00', fontSize: 'var(--text-xs)' }}>
            ⚠️ This user is the only registered owner for this facility. A facility must retain at least one active owner.
          </div>
        )}

        {error && <FormError message={error} />}

        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={isPending}
            disabled={isLastOwner && member.role === 'owner'}
            style={{ background: '#b3261e', borderColor: '#b3261e', color: '#ffffff' }}
          >
            {isPending ? 'Removing…' : 'Remove member'}
          </Button>
        </div>
      </div>
    </div>
  );
}
