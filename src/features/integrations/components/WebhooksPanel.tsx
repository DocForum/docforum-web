import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import { CreateWebhookDialog } from './CreateWebhookDialog';
import { WebhookDeliveries } from './WebhookDeliveries';
import {
  useWebhookEndpoints,
  useDeleteWebhookEndpoint,
  useSendTestDelivery,
} from '../hooks/useIntegrations';
import type { WebhookEndpoint } from '../../../types/models';
import styles from './Integrations.module.css';

// Fallback data for preview/development when backend endpoint is not yet connected
export const DEFAULT_MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh-1',
    facilityId: 'fac-main',
    url: 'https://lab.example.test/webhooks/docforum',
    events: ['order.created', 'order.assigned', 'order.fulfilled'],
    secretPrefix: 'whsec_a1b2',
    active: true,
    lastDeliveryAt: '2026-10-18T16:00:00Z',
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
];

interface WebhooksPanelProps {
  facilityId: string;
}

export function WebhooksPanel({ facilityId }: WebhooksPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WebhookEndpoint | null>(null);
  const [refocusAfterDelete, setRefocusAfterDelete] = useState<{ id: string; index: number } | null>(
    null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Blocks a second mutate from a double-click before React re-renders the
  // button into its pending state (issue #241).
  const deleteInFlightRef = useRef(false);
  const t = useT();
  const { data: endpointsData, isLoading } = useWebhookEndpoints(facilityId);
  const deleteMutation = useDeleteWebhookEndpoint(facilityId);
  const testMutation = useSendTestDelivery(facilityId);

  const endpoints: WebhookEndpoint[] = endpointsData ?? DEFAULT_MOCK_WEBHOOKS;

  // After the endpoint disappears, focus the next Delete button, or the list
  // heading when none are left (issue #241).
  useEffect(() => {
    if (!refocusAfterDelete) return;
    if (endpoints.some((endpoint) => endpoint.id === refocusAfterDelete.id)) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-delete-endpoint]');
    const next = buttons && buttons.length > 0
      ? buttons[Math.min(refocusAfterDelete.index, buttons.length - 1)]
      : null;
    (next ?? headingRef.current)?.focus();
    setRefocusAfterDelete(null);
  }, [endpoints, refocusAfterDelete]);

  const confirmDelete = () => {
    if (!pendingDelete || deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    const endpoint = pendingDelete;
    const index = endpoints.findIndex((candidate) => candidate.id === endpoint.id);
    deleteMutation.mutate(endpoint.id, {
      onSuccess: () => {
        setPendingDelete(null);
        if (expandedEndpointId === endpoint.id) {
          setExpandedEndpointId(null);
        }
        setRefocusAfterDelete({ id: endpoint.id, index: Math.max(index, 0) });
      },
      onSettled: () => {
        deleteInFlightRef.current = false;
      },
    });
  };

  const handleTest = (endpointId: string) => {
    testMutation.mutate(endpointId, {
      onSettled: () => {
        setExpandedEndpointId(endpointId);
      },
    });
  };

  const toggleDeliveries = (endpointId: string) => {
    setExpandedEndpointId((prev) => (prev === endpointId ? null : endpointId));
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <Spinner size={24} />
          <p>Loading webhook endpoints…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 ref={headingRef} tabIndex={-1}>
          Webhooks
        </h2>
        <Button onClick={() => setCreateDialogOpen(true)}>Add endpoint</Button>
      </div>
      <p className={styles.headerSubtitle}>
        Webhooks notify your systems when orders or payments change.
        Each delivery is signed with an HMAC secret so you can verify authenticity.
      </p>

      {endpoints.length === 0 ? (
        <div className={styles.emptyState}>
          No webhook endpoints configured. Add one to receive real-time event notifications.
        </div>
      ) : (
        <div
          ref={listRef}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className={styles.webhookCard}>
              <div className={styles.webhookCardHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1, minWidth: 0 }}>
                  <span className={styles.webhookUrl}>{endpoint.url}</span>
                  <div className={styles.webhookMeta}>
                    <span className={styles.activeBadge}>Active</span>
                    <span>Secret: {endpoint.secretPrefix}…</span>
                    <span>
                      Last delivery:{' '}
                      {endpoint.lastDeliveryAt
                        ? new Date(endpoint.lastDeliveryAt).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <Button
                    variant="secondary"
                    onClick={() => handleTest(endpoint.id)}
                    loading={testMutation.isPending && testMutation.variables === endpoint.id}
                  >
                    Send test
                  </Button>
                  <Button variant="secondary" onClick={() => toggleDeliveries(endpoint.id)}>
                    {expandedEndpointId === endpoint.id ? 'Hide deliveries' : 'Recent deliveries'}
                  </Button>
                  <Button
                    variant="danger"
                    data-delete-endpoint
                    onClick={() => setPendingDelete(endpoint)}
                    loading={deleteMutation.isPending && deleteMutation.variables === endpoint.id}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {endpoint.events.map((event) => (
                  <span key={event} className={styles.eventTag}>
                    {event}
                  </span>
                ))}
              </div>

              {expandedEndpointId === endpoint.id && (
                <div className={styles.deliveriesSection}>
                  <WebhookDeliveries facilityId={facilityId} endpointId={endpoint.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createDialogOpen && (
        <CreateWebhookDialog facilityId={facilityId} onClose={() => setCreateDialogOpen(false)} />
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        labelledBy="delete-webhook-title"
        describedBy="delete-webhook-description"
        overlayClassName={styles.modalOverlay}
        panelClassName={styles.modalContent}
      >
        <h3 id="delete-webhook-title">{t('integrations.deleteWebhook.title', 'Delete webhook endpoint?')}</h3>
        <p id="delete-webhook-description" className={styles.modalDescription}>
          {t(
            'integrations.deleteWebhook.description',
            'Deleting {url} stops new deliveries and drops any pending ones. This cannot be undone.',
            { url: pendingDelete?.url ?? '' },
          )}
        </p>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => setPendingDelete(null)}
            disabled={deleteMutation.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            loading={deleteMutation.isPending}
          >
            {t('integrations.deleteWebhook.confirm', 'Delete endpoint')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
