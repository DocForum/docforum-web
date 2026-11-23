/* eslint-disable no-restricted-syntax -- Existing DEFAULT_MOCK_* fixture tracked by #299; it moves to src/mocks/ or goes when the real endpoint lands. */
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { CreateWebhookDialog } from './CreateWebhookDialog';
import { WebhookDeliveries } from './WebhookDeliveries';
import {
  useWebhookEndpoints,
  useDeleteWebhookEndpoint,
  useSendTestDelivery,
} from '../hooks/useIntegrations';
import { useT } from '../../../i18n/useT';
import { webhookEventDescription } from '../webhook-events';
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
  const t = useT();
  const { locale } = useIntl();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const { data: endpointsData, isLoading, isError, error, refetch } = useWebhookEndpoints(facilityId);
  const deleteMutation = useDeleteWebhookEndpoint(facilityId);
  const testMutation = useSendTestDelivery(facilityId);
  const errorText = useErrorMessage();

  const endpoints: WebhookEndpoint[] = endpointsData ?? [];
  const errorMessage = isError
    ? errorText(error) ?? 'Webhook endpoints could not be loaded.'
    : null;

  const handleDelete = (endpointId: string, url: string) => {
    if (
      window.confirm(
        t('integrations.webhooks.deleteConfirm', 'Delete webhook endpoint {url}? Pending deliveries will be dropped. This cannot be undone.', {
          url,
        }),
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
        <Skeleton lines={3} label={t('integrations.webhooks.loading', 'Loading webhook endpoints…')} />
      </div>
    );
  }

  if (errorMessage && endpointsData === undefined) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>{t('integrations.webhooks.title', 'Webhooks')}</h2>
        </div>
        <InlineError
          title="Webhook endpoints couldn't be loaded"
          message={errorMessage}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{t('integrations.webhooks.title', 'Webhooks')}</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>{t('integrations.webhooks.addEndpoint', 'Add endpoint')}</Button>
      </div>
      <p className={styles.headerSubtitle}>
        {t('integrations.webhooks.subtitle', 'Webhooks notify your systems when orders or payments change. Each delivery is signed with an HMAC secret so you can verify authenticity.')}
      </p>

      {errorMessage && (
        <InlineError
          title="Webhook endpoints may be out of date"
          message={errorMessage}
          onRetry={() => void refetch()}
        />
      )}

      {endpoints.length === 0 ? (
        <EmptyState
          title={t('integrations.webhooks.empty', 'No webhook endpoints configured. Add one to receive real-time event notifications.')}
          description="Add one to receive real-time event notifications in your systems."
          action={{ label: 'Add your first endpoint', onClick: () => setCreateDialogOpen(true) }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className={styles.webhookCard}>
              <div className={styles.webhookCardHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1, minWidth: 0 }}>
                  <span className={styles.webhookUrl}>{endpoint.url}</span>
                  <div className={styles.webhookMeta}>
                    <span className={styles.activeBadge}>{t('integrations.webhooks.active', 'Active')}</span>
                    <span>
                      {t('integrations.webhooks.secret', 'Secret: {prefix}…', { prefix: endpoint.secretPrefix })}
                    </span>
                    <span>
                      {t('integrations.webhooks.lastDelivery', 'Last delivery: {date}', {
                        date: endpoint.lastDeliveryAt
                          ? new Date(endpoint.lastDeliveryAt).toLocaleString(locale)
                          : t('integrations.common.never', 'Never'),
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <Button
                    variant="secondary"
                    onClick={() => handleTest(endpoint.id)}
                    loading={testMutation.isPending && testMutation.variables === endpoint.id}
                  >
                    {t('integrations.webhooks.sendTest', 'Send test')}
                  </Button>
                  <Button variant="secondary" onClick={() => toggleDeliveries(endpoint.id)}>
                    {expandedEndpointId === endpoint.id
                      ? t('integrations.webhooks.hideDeliveries', 'Hide deliveries')
                      : t('integrations.delivery.recent', 'Recent deliveries')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(endpoint.id, endpoint.url)}
                    loading={deleteMutation.isPending && deleteMutation.variables === endpoint.id}
                  >
                    {t('integrations.webhooks.delete', 'Delete')}
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {endpoint.events.map((event) => (
                  <span key={event} className={styles.eventTag} title={webhookEventDescription(t, event)}>
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
