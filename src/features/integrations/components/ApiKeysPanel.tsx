/* eslint-disable no-restricted-syntax -- Existing DEFAULT_MOCK_* fixture tracked by #299; it moves to src/mocks/ or goes when the real endpoint lands. */
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { useApiKeys, useRevokeApiKey } from '../hooks/useIntegrations';
import { useT } from '../../../i18n/useT';
import type { FacilityApiKey } from '../../../types/models';
import styles from './Integrations.module.css';

// Fallback data for preview/development when backend endpoint is not yet connected
export const DEFAULT_MOCK_API_KEYS: FacilityApiKey[] = [
  {
    id: 'key-1',
    facilityId: 'fac-main',
    name: 'Lab Information System',
    prefix: 'df_live_a1b2c3d4',
    scopes: ['orders.read', 'orders.write'],
    lastUsedAt: '2026-10-18T14:30:00Z',
    revokedAt: null,
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'key-2',
    facilityId: 'fac-main',
    name: 'Inventory Sync',
    prefix: 'df_live_e5f6g7h8',
    scopes: [],
    lastUsedAt: null,
    revokedAt: null,
    createdAt: '2026-10-01T09:00:00Z',
  },
];

interface ApiKeysPanelProps {
  facilityId: string;
}

export function ApiKeysPanel({ facilityId }: ApiKeysPanelProps) {
  const t = useT();
  const { locale } = useIntl();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: keysData, isLoading, isError, error, refetch } = useApiKeys(facilityId);
  const revokeMutation = useRevokeApiKey(facilityId);
  const errorText = useErrorMessage();

  const keys: FacilityApiKey[] = keysData ?? [];
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const errorMessage = isError
    ? errorText(error) ?? 'API keys could not be loaded.'
    : null;

  const handleRevoke = (keyId: string, keyName: string) => {
    if (
      window.confirm(
        t('integrations.apiKeys.revokeConfirm', 'Revoke "{name}"? Integrations using this key will immediately lose access. This cannot be undone.', {
          name: keyName,
        }),
      )
    ) {
      revokeMutation.mutate(keyId);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <Skeleton lines={3} label={t('integrations.apiKeys.loading', 'Loading API keys…')} />
      </div>
    );
  }

  if (errorMessage && keysData === undefined) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>{t('integrations.apiKeys.title', 'API Keys')}</h2>
        </div>
        <InlineError
          title="API keys couldn't be loaded"
          message={errorMessage}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{t('integrations.apiKeys.title', 'API Keys')}</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>{t('integrations.apiKeys.create', 'Create key')}</Button>
      </div>
      <p className={styles.headerSubtitle}>
        {t('integrations.apiKeys.subtitle', 'Keys authenticate your lab or pharmacy software when it calls the DocForum API. Each key is scoped and can be revoked at any time.')}
      </p>

      {errorMessage && (
        <InlineError title="API keys may be out of date" message={errorMessage} onRetry={() => void refetch()} />
      )}

      {activeKeys.length === 0 ? (
        <EmptyState
          title={t('integrations.apiKeys.empty', 'No active API keys. Create one to let your systems integrate with DocForum.')}
          description="Create one to let your lab or pharmacy systems integrate with DocForum."
          action={{ label: 'Create your first key', onClick: () => setCreateDialogOpen(true) }}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>{t('integrations.apiKeys.colName', 'Name')}</th>
                <th>{t('integrations.apiKeys.colPrefix', 'Prefix')}</th>
                <th>{t('integrations.apiKeys.colScopes', 'Scopes')}</th>
                <th>{t('integrations.apiKeys.colCreated', 'Created')}</th>
                <th>{t('integrations.apiKeys.colLastUsed', 'Last used')}</th>
                <th aria-label={t('integrations.common.actions', 'Actions')} />
              </tr>
            </thead>
            <tbody>
              {activeKeys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    <span className={styles.prefixCell}>{key.prefix}…</span>
                  </td>
                  <td>
                    {key.scopes.length === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                        {t('integrations.apiKeys.allScopes', 'All scopes')}
                      </span>
                    ) : (
                      key.scopes.map((s) => (
                        <span key={s} className={styles.eventTag} style={{ marginRight: '0.25rem' }}>
                          {s}
                        </span>
                      ))
                    )}
                  </td>
                  <td>{new Date(key.createdAt).toLocaleDateString(locale)}</td>
                  <td>
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString(locale)
                      : t('integrations.common.never', 'Never')}
                  </td>
                  <td className={styles.actionCell}>
                    <Button
                      variant="danger"
                      onClick={() => handleRevoke(key.id, key.name)}
                      loading={revokeMutation.isPending && revokeMutation.variables === key.id}
                    >
                      {t('integrations.apiKeys.revoke', 'Revoke')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {keys.some((k) => k.revokedAt) && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-2)' }}>
            {t('integrations.apiKeys.revokedKeys', 'Revoked keys')}
          </h3>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t('integrations.apiKeys.colName', 'Name')}</th>
                  <th>{t('integrations.apiKeys.colPrefix', 'Prefix')}</th>
                  <th>{t('integrations.apiKeys.colRevoked', 'Revoked')}</th>
                </tr>
              </thead>
              <tbody>
                {keys
                  .filter((k) => k.revokedAt)
                  .map((key) => (
                    <tr key={key.id} style={{ opacity: 0.6 }}>
                      <td>{key.name}</td>
                      <td>
                        <span className={styles.prefixCell}>{key.prefix}…</span>
                      </td>
                      <td>
                        <span className={styles.revokedBadge}>{t('integrations.apiKeys.revoked', 'Revoked')}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createDialogOpen && (
        <CreateApiKeyDialog facilityId={facilityId} onClose={() => setCreateDialogOpen(false)} />
      )}
    </div>
  );
}
