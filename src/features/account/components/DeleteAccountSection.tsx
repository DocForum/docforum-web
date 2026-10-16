import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import styles from './DeleteAccountSection.module.css';

interface DeleteAccountSectionProps {
  onRequestExportClick?: () => void;
}

export function DeleteAccountSection({ onRequestExportClick }: DeleteAccountSectionProps) {
  const deleteMutation = useDeleteAccount();

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
          setClientError(err instanceof Error ? err.message : 'Failed to delete account');
        },
      },
    );
  };

  return (
    <section className={styles.section} aria-labelledby="delete-account-heading">
      <div className={styles.header}>
        <span className={styles.dangerBadge} aria-hidden="true">
          ⚠ Irreversible Action
        </span>
        <h2 id="delete-account-heading" className={styles.title}>
          Delete account
        </h2>
        <p className={styles.description}>
          Closing your DocForum account permanently removes your login identity. Because healthcare and escrow
          platforms have statutory audit obligations, here is exactly what happens:
        </p>
      </div>

      <div className={styles.retentionPolicyBox}>
        <div className={styles.policyColumn}>
          <div className={styles.columnHeaderScrubbed}>
            <span aria-hidden="true">✕</span>
            <span>Permanently Deleted & Anonymized</span>
          </div>
          <ul className={styles.policyList}>
            <li>Account credentials and password hashes</li>
            <li>Profile names and personal contact information</li>
            <li>Direct messaging records and notification preferences</li>
            <li>Guardian and dependent authorization links</li>
          </ul>
        </div>
        <div className={styles.policyColumn}>
          <div className={styles.columnHeaderRetained}>
            <span aria-hidden="true">🔒</span>
            <span>Retained by Statutory Obligation</span>
          </div>
          <ul className={styles.policyList}>
            <li>Clinical consultation summaries and diagnosis records (7-year statutory retention)</li>
            <li>Prescription and laboratory test fulfillment logs</li>
            <li>Cryptographic escrow transaction hashes on the Stellar ledger</li>
            <li>Anonymized compliance audit trails with identity disconnected</li>
          </ul>
        </div>
      </div>

      <div className={styles.exportCallout}>
        <div>
          <p className={styles.exportCalloutText}>
            <strong>Export your records first:</strong> Once your account is deleted, you will no longer have access to
            the patient portal or your historical care threads.
          </p>
        </div>
        {onRequestExportClick && (
          <Button type="button" variant="secondary" onClick={onRequestExportClick}>
            Download export first
          </Button>
        )}
      </div>

      <div>
        <Button type="button" variant="danger" onClick={handleOpenModal}>
          Proceed to delete account…
        </Button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className={styles.modal}>
            <h3 id="delete-modal-title" className={styles.modalTitle}>
              Confirm permanent account deletion
            </h3>
            <p className={styles.modalWarning}>
              This action cannot be undone. All active sessions will be terminated and your profile will be
              permanently deactivated.
            </p>

            <form onSubmit={handleDeleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <TextField
                label="Confirm your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />

              <div>
                <TextField
                  label="Type DELETE to confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                />
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  To prevent accidental deletion, you must type <strong>DELETE</strong> in all caps.
                </p>
              </div>

              {clientError && <FormError message={clientError} />}

              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!isConfirmationMatched || !password}
                  loading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Permanently delete account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
