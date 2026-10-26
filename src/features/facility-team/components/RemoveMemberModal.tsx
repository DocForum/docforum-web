import { useState } from 'react';
import { useT } from '../../../i18n/useT';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Dialog } from '../../../components/Dialog';
import { useErrorMessage } from '../../../hooks/useErrorText';
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
  const t = useT();
  const errorMessage = useErrorMessage();

  const handleConfirm = async () => {
    if (!member) return;
    setError(null);

    // Guard: Owner-only action
    if (!isOwner) {
      setError(t('facilityTeam.removeOwnerOnly', 'Unauthorized: Only facility owners can remove members.'));
      return;
    }

    // Guard: Cannot remove last owner
    if (member.role === 'owner' && isLastOwner) {
      setError(
        t(
          'facilityTeam.removeLastOwnerError',
          'Cannot remove the only facility owner. Transfer ownership or invite another owner before removing this account.',
        ),
      );
      return;
    }

    try {
      await onConfirm(member.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog
      open={Boolean(member)}
      onClose={onClose}
      labelledBy="remove-title"
      describedBy="remove-description"
      overlayClassName={styles.modalOverlay}
      panelClassName={styles.modalContent}
    >
      <h3 id="remove-title">{t('facilityTeam.removeTitle', 'Remove team member')}</h3>
      <p id="remove-description" className={styles.modalDescription}>
        {t('facilityTeam.removeConfirm', 'Are you sure you want to remove {name} ({email}) from this facility?', {
          name: member?.fullName ?? '',
          email: member?.email ?? '',
        })}
      </p>

      <div className={styles.dangerNotice} role="note">
        <strong>{t('facilityTeam.securityNoticeTitle', 'Important security notice:')}</strong>{' '}
        {t(
          'facilityTeam.securityNotice',
          'Removing a member immediately signs them out and revokes all active backend sessions and dispensing permissions for this facility.',
        )}
      </div>

      {isLastOwner && member?.role === 'owner' && (
        <div className={styles.warningNotice} role="note">
          <span aria-hidden="true">⚠️ </span>
          {t(
            'facilityTeam.onlyOwnerWarning',
            'This user is the only registered owner for this facility. A facility must retain at least one active owner.',
          )}
        </div>
      )}

      {error && <FormError message={error} />}

      <div className={styles.modalActions}>
        <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          loading={isPending}
          disabled={isLastOwner && member?.role === 'owner'}
        >
          {isPending ? t('facilityTeam.removing', 'Removing…') : t('facilityTeam.remove', 'Remove member')}
        </Button>
      </div>
    </Dialog>
  );
}
