import { Spinner } from '../../../components/Spinner';
import { Button } from '../../../components/Button';
import { useWebhookDeliveries, useRedeliverWebhook } from '../hooks/useIntegrations';
import type { WebhookDelivery, WebhookDeliveryStatus } from '../../../types/models';
import styles from './Integrations.module.css';

// Fallback data for preview/development
export const DEFAULT_MOCK_DELIVERIES: WebhookDelivery[] = [
  {
    id: 'del-1',
    endpointId: 'wh-1',
    event: 'order.created',
    status: 'success',
    responseStatusCode: 200,
    errorMessage: null,
    attemptCount: 1,
    deliveredAt: '2026-10-18T16:00:00Z',
    createdAt: '2026-10-18T16:00:00Z',
  },
  {
    id: 'del-2',
    endpointId: 'wh-1',
    event: 'order.fulfilled',
    status: 'failed',
    responseStatusCode: 500,
    errorMessage: 'Internal Server Error',
    attemptCount: 3,
    deliveredAt: null,
    createdAt: '2026-10-17T11:30:00Z',
  },
];

function StatusPill({ status }: { status: WebhookDeliveryStatus }) {
  const className =
    status === 'success'
      ? styles.statusSuccess
      : status === 'failed'
        ? styles.statusFailed
        : styles.statusPending;

  return <span className={`${styles.statusPill} ${className}`}>{status}</span>;
}

interface WebhookDeliveriesProps {
  facilityId: string;
  endpointId: string;
}

export function WebhookDeliveries({ facilityId, endpointId }: WebhookDeliveriesProps) {
  const { data: deliveriesData, isLoading } = useWebhookDeliveries(facilityId, endpointId);
  const redeliverMutation = useRedeliverWebhook(facilityId);

  const deliveries: WebhookDelivery[] = deliveriesData ?? DEFAULT_MOCK_DELIVERIES;

  const handleRedeliver = (deliveryId: string) => {
    redeliverMutation.mutate({ endpointId, deliveryId });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
        <Spinner size={20} />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className={styles.emptyState} style={{ padding: 'var(--space-4)' }}>
        No deliveries yet. Send a test event to see delivery history.
      </div>
    );
  }

  return (
    <div>
      <div className={styles.deliveriesHeader}>
        <h3>Recent deliveries</h3>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Response</th>
              <th>Attempts</th>
              <th>Delivered</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td>
                  <code style={{ fontSize: 'var(--text-xs)' }}>{delivery.event}</code>
                </td>
                <td>
                  <StatusPill status={delivery.status} />
                </td>
                <td>
                  {delivery.responseStatusCode ?? (
                    <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                  )}
                  {delivery.errorMessage && (
                    <div style={{ fontSize: 'var(--text-xs)', color: '#b3261e', marginTop: '0.15rem' }}>
                      {delivery.errorMessage}
                    </div>
                  )}
                </td>
                <td>{delivery.attemptCount}</td>
                <td>
                  {delivery.deliveredAt
                    ? new Date(delivery.deliveredAt).toLocaleTimeString()
                    : '—'}
                </td>
                <td className={styles.actionCell}>
                  {(delivery.status === 'failed' || delivery.status === 'pending') && (
                    <Button
                      variant="secondary"
                      onClick={() => handleRedeliver(delivery.id)}
                      loading={
                        redeliverMutation.isPending &&
                        redeliverMutation.variables?.deliveryId === delivery.id
                      }
                    >
                      Redeliver
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
