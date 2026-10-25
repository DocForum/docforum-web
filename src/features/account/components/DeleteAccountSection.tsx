import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import styles from './DeleteAccountSection.module.css';

interface DeleteAccountSectionProps {
  onRequestExportClick?: () => void;
}

export function DeleteAccountSection({ onRequestExportClick }: DeleteAccountSectionProps) {
  const deleteMutation = useDeleteAccount();
  const t = useT();
  const errorMessage = useErrorMessage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setPassword('');
    setConfirmText('');
    setClientError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPassword('');
    setConfirmText('');
    setClientError(null);
  };

  const isConfirmationMatched = confirmText.trim() === 'DELETE';

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setClientError('Please enter your password to confirm account deletion.');
      return;
    }
    if (!isConfirmationMatched) {
      setClientError('Please type DELETE exactly to confirm.');
      return;
    }
    setClientError(null);

    deleteMutation.mutate(
      { password, confirmation: confirmText },
      {
        onError: (err) => {
          setClientError(errorMessage(err));
        },
      },
    );
  };

  return (
    <section className={styles.section} aria-labelledby="delete-account-heading">
      <div className={styles.header}>
        <span className={styles.dangerBadge} aria-hidden="true">
                ⚠ {t('account.delete.irreversible', 'Irreversible Action')}
              </span>
        <h2 id="delete-account-heading" className={styles.title}>
                {t('account.delete.heading', 'Delete account')}
              </h2>
        <p className={styles.description}>
                {t('account.delete.description', 'Closing your DocForum account permanently removes your login identity. Because healthcare and escrow platforms have statutory audit obligations, here is exactly what happens:')}
              </p>
      </div>

      <div className={styles.retentionPolicyBox}>
        <div className={styles.policyColumn}>
          <div className={styles.columnHeaderScrubbed}>
            <span aria-hidden="true">✕</span>
            <span>{t('account.delete.permanentlyDeleted', 'Permanently Deleted & Anonymized')}</span>
          </div>
          <ul className={styles.policyList}>
              <li>{t('account.delete.policy1', 'Account credentials and password hashes')}</li>
              <li>{t('account.delete.policy2', 'Profile names and personal contact information')}</li>
              <li>{t('account.delete.policy3', 'Direct messaging records and notification preferences')}</li>
              <li>{t('account.delete.policy4', 'Guardian and dependent authorization links')}</li>
            </ul>
        </div>
        <div className={styles.policyColumn}>
          <div className={styles.columnHeaderRetained}>
            <span aria-hidden="true">🔒</span>
            <span>{t('account.retained', 'Retained by Statutory Obligation')}</span>
          </div>
          <ul className={styles.policyList}>
              <li>{t('account.retained.policy1', 'Clinical consultation summaries and diagnosis records (7-year statutory retention)')}</li>
              <li>{t('account.retained.policy2', 'Prescription and laboratory test fulfillment logs')}</li>
              <li>{t('account.retained.policy3', 'Cryptographic escrow transaction hashes on the Stellar ledger')}</li>
              <li>{t('account.retained.policy4', 'Anonymized compliance audit trails with identity disconnected')}</li>
            </ul>
        </div>
      </div>

      <div className={styles.exportCallout}>
        <div>
          <p className={styles.exportCalloutText}>
              <strong>{t('account.delete.exportFirst', 'Export your records first:')}</strong> Once your account is deleted, you will no longer have access to
              the patient portal or your historical care threads.
            </p>
        </div>
        {onRequestExportClick && (
          <Button type="button" variant="secondary" onClick={onRequestExportClick}>
                {t('account.delete.downloadExport', 'Download export first')}
              </Button>
        )}
      </div>

      <div>
        <Button type="button" variant="danger" onClick={handleOpenModal}>
                {t('account.delete.proceed', 'Proceed to delete account…')}
              </Button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className={styles.modal}>
            <h3 id="delete-modal-title" className={styles.modalTitle}>
                {t('account.delete.confirmTitle', 'Confirm permanent account deletion')}
              </h3>
            <p className={styles.modalWarning}>
                {t('account.delete.warning', 'This action cannot be undone. All active sessions will be terminated and your profile will be permanently deactivated.')}
              </p>

            <form onSubmit={handleDeleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <TextField
                label={t('account.delete.confirmPassword', 'Confirm your password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />

              <div>
                <TextField
                  label={t('account.delete.typeDelete', 'Type DELETE to confirm')}
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                />
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {t('account.delete.deleteInCaps', 'To prevent accidental deletion, you must type <strong>DELETE</strong> in all caps.')}
                </p>
              </div>

              {clientError && <FormError message={clientError} />}

              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!isConfirmationMatched || !password}
                  loading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t('account.delete.deleting', 'Deleting…') : t('account.delete.permanentlyDelete', 'Permanently delete account')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
