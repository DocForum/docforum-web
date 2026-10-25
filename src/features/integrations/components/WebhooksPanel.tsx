import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
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
  const { data: endpointsData, isLoading } = useWebhookEndpoints(facilityId);
  const deleteMutation = useDeleteWebhookEndpoint(facilityId);
  const testMutation = useSendTestDelivery(facilityId);

  const endpoints: WebhookEndpoint[] = endpointsData ?? DEFAULT_MOCK_WEBHOOKS;

  const handleDelete = (endpointId: string, url: string) => {
    if (
      window.confirm(
        `Delete webhook endpoint ${url}? Pending deliveries will be dropped. This cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(endpointId);
      if (expandedEndpointId === endpointId) {
        setExpandedEndpointId(null);
      }
    }
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
        <h2>Webhooks</h2>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                    onClick={() => handleDelete(endpoint.id, endpoint.url)}
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
    </div>
  );
}
