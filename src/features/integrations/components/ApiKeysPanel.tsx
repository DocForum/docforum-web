import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { useApiKeys, useRevokeApiKey } from '../hooks/useIntegrations';
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: keysData, isLoading } = useApiKeys(facilityId);
  const revokeMutation = useRevokeApiKey(facilityId);

  const keys: FacilityApiKey[] = keysData ?? DEFAULT_MOCK_API_KEYS;
  const activeKeys = keys.filter((k) => !k.revokedAt);

  const handleRevoke = (keyId: string, keyName: string) => {
    if (
      window.confirm(
        `Revoke "${keyName}"? Integrations using this key will immediately lose access. This cannot be undone.`,
      )
    ) {
      revokeMutation.mutate(keyId);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <Spinner size={24} />
          <p>Loading API keys…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>API Keys</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>Create key</Button>
      </div>
      <p className={styles.headerSubtitle}>
        Keys authenticate your lab or pharmacy software when it calls the DocForum API.
        Each key is scoped and can be revoked at any time.
      </p>

      {activeKeys.length === 0 ? (
        <div className={styles.emptyState}>
          No active API keys. Create one to let your systems integrate with DocForum.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Scopes</th>
                <th>Created</th>
                <th>Last used</th>
                <th aria-label="Actions" />
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
                        All scopes
                      </span>
                    ) : (
                      key.scopes.map((s) => (
                        <span key={s} className={styles.eventTag} style={{ marginRight: '0.25rem' }}>
                          {s}
                        </span>
                      ))
                    )}
                  </td>
                  <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td>
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className={styles.actionCell}>
                    <Button
                      variant="danger"
                      onClick={() => handleRevoke(key.id, key.name)}
                      loading={revokeMutation.isPending && revokeMutation.variables === key.id}
                    >
                      Revoke
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
            Revoked keys
          </h3>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Revoked</th>
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
                        <span className={styles.revokedBadge}>Revoked</span>
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
