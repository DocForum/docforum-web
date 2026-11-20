import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
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
  const [pendingRevoke, setPendingRevoke] = useState<FacilityApiKey | null>(null);
  const [refocusAfterRevoke, setRefocusAfterRevoke] = useState<{ id: string; index: number } | null>(
    null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // Blocks a second mutate from a double-click before React re-renders the
  // button into its pending state (issue #241).
  const revokeInFlightRef = useRef(false);
  const { data: keysData, isLoading, isError, error, refetch } = useApiKeys(facilityId);
  const revokeMutation = useRevokeApiKey(facilityId);
  const errorText = useErrorMessage();

  const keys: FacilityApiKey[] = keysData ?? [];
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const errorMessage = isError
    ? errorText(error) ?? 'API keys could not be loaded.'
    : null;

  // Once the revoked row is actually gone, move focus to the row that took its
  // place, or to the list heading when no keys are left (issue #241).
  useEffect(() => {
    if (!refocusAfterRevoke) return;
    if (activeKeys.some((k) => k.id === refocusAfterRevoke.id)) return;
    const buttons = tableRef.current?.querySelectorAll<HTMLButtonElement>('[data-revoke-key]');
    const next = buttons && buttons.length > 0
      ? buttons[Math.min(refocusAfterRevoke.index, buttons.length - 1)]
      : null;
    (next ?? headingRef.current)?.focus();
    setRefocusAfterRevoke(null);
  }, [activeKeys, refocusAfterRevoke]);

  const confirmRevoke = () => {
    if (!pendingRevoke || revokeInFlightRef.current) return;
    revokeInFlightRef.current = true;
    const revoked = pendingRevoke;
    const index = activeKeys.findIndex((key) => key.id === revoked.id);
    revokeMutation.mutate(revoked.id, {
      onSuccess: () => {
        setPendingRevoke(null);
        setRefocusAfterRevoke({ id: revoked.id, index: Math.max(index, 0) });
      },
      onSettled: () => {
        revokeInFlightRef.current = false;
      },
    });
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
        <h2 ref={headingRef} tabIndex={-1}>
          {t('integrations.apiKeys.title', 'API Keys')}
        </h2>
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
        <div className={styles.tableWrapper} ref={tableRef}>
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
                      data-revoke-key
                      onClick={() => setPendingRevoke(key)}
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

      <Dialog
        open={Boolean(pendingRevoke)}
        onClose={() => setPendingRevoke(null)}
        labelledBy="revoke-key-title"
        describedBy="revoke-key-description"
        overlayClassName={styles.modalOverlay}
        panelClassName={styles.modalContent}
      >
        <h3 id="revoke-key-title">{t('integrations.revokeKey.title', 'Revoke API key?')}</h3>
        <p id="revoke-key-description" className={styles.modalDescription}>
          {t(
            'integrations.revokeKey.description',
            'Revoking {name} ({prefix}…) immediately cuts off every integration that uses it. This cannot be undone.',
            { name: pendingRevoke?.name ?? '', prefix: pendingRevoke?.prefix ?? '' },
          )}
        </p>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => setPendingRevoke(null)}
            disabled={revokeMutation.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={confirmRevoke}
            loading={revokeMutation.isPending}
          >
            {t('integrations.revokeKey.confirm', 'Revoke key')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
