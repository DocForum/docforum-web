import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useCreateApiKey } from '../hooks/useIntegrations';
import { useT } from '../../../i18n/useT';
import type { CreatedApiKey } from '../../../types/models';
import styles from './Integrations.module.css';

interface CreateApiKeyDialogProps {
  facilityId: string;
  onClose: () => void;
}

export function CreateApiKeyDialog({ facilityId, onClose }: CreateApiKeyDialogProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateApiKey(facilityId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setCreatedKey(data);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — user can select and copy manually
    }
  };

  const handleDone = () => {
    // Drop the secret from the mutation cache before unmounting the dialog.
    createMutation.reset();
    setCreatedKey(null);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="create-key-title">
      <div className={styles.modalContent}>
        {createdKey ? (
          <>
            <h3 id="create-key-title">{t('integrations.apiKeyCreate.createdTitle', 'API key created')}</h3>
            <div className={styles.secretWarning}>
              <span aria-hidden="true">⚠️</span>
              <span>
                {t('integrations.apiKeyCreate.secretWarning', 'Copy this secret now. For security, it will never be shown again. If you lose it, you must revoke this key and create a new one.')}
              </span>
            </div>
            <div className={styles.secretBox}>
              <span className={styles.secretValue}>{createdKey.secret}</span>
              <button
                type="button"
                className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
                onClick={handleCopy}
              >
                {copied ? t('integrations.common.copied', 'Copied!') : t('integrations.common.copy', 'Copy')}
              </button>
            </div>
            <div className={styles.modalActions}>
              <Button onClick={handleDone}>{t('integrations.common.savedSecret', 'I have saved the secret')}</Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="create-key-title">{t('integrations.apiKeyCreate.title', 'Create API key')}</h3>
            <p className={styles.modalDescription}>
              {t('integrations.apiKeyCreate.description', 'Give this key a descriptive name so you can identify it later, e.g. "Lab LIS integration" or "Inventory sync".')}
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className={styles.formGroup}>
                <label htmlFor="key-name" className={styles.formLabel}>
                  {t('integrations.apiKeyCreate.nameLabel', 'Key name')}
                </label>
                <input
                  id="key-name"
                  type="text"
                  className={styles.formInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('integrations.apiKeyCreate.namePlaceholder', 'e.g. Lab Information System')}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" loading={createMutation.isPending} disabled={!name.trim()}>
                  {createMutation.isPending
                    ? t('integrations.common.creating', 'Creating…')
                    : t('integrations.apiKeys.create', 'Create key')}
                </Button>
              </div>
              {createMutation.isError && (
                <p style={{ color: '#b3261e', fontSize: 'var(--text-sm)', margin: 0 }}>
                  {t('integrations.apiKeyCreate.error', 'Failed to create key. Please try again.')}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
