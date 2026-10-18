import { useState } from 'react';
import { Button } from '../../../components/Button';
import type { FulfillmentQueueItem } from '../../../types/models';
import styles from './FacilityTeam.module.css';

interface FulfillmentQueueProps {
  items: FulfillmentQueueItem[];
  onAction: (itemId: string, action: 'fulfilled' | 'rejected', notes?: string) => Promise<unknown>;
  isUpdating: boolean;
}

export function FulfillmentQueueWithAttribution({
  items,
  onAction,
  isUpdating,
}: FulfillmentQueueProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleAction = async (itemId: string, action: 'fulfilled' | 'rejected') => {
    setSelectedItem(itemId);
    try {
      await onAction(itemId, action);
    } finally {
      setSelectedItem(null);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="queue-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="queue-heading">Fulfillment queue &amp; action attribution</h2>
          <p className={styles.headerSubtitle}>
            Prescriptions and diagnostic tests assigned to this facility with audit trail attribution.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>No items in fulfillment queue</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {items.map((item) => {
            const isItemUpdating = isUpdating && selectedItem === item.id;

            return (
              <div key={item.id} className={styles.queueItem} tabIndex={0}>
                <div className={styles.queueItemHeader}>
                  <div>
                    <span className={styles.orderTitle}>{item.itemName}</span>
                    <div className={styles.orderMeta}>
                      <span>Patient: {item.patientName}</span> •{' '}
                      <span>Type: {item.orderType === 'prescription' ? 'Prescription Dispense' : 'Diagnostic Order'}</span> •{' '}
                      <span>Received: {new Date(item.receivedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`${styles.statusPill} ${
                        item.status === 'fulfilled'
                          ? styles.statusFulfilled
                          : item.status === 'rejected'
                          ? styles.statusRejected
                          : styles.statusPending
                      }`}
                    >
                      {item.status === 'fulfilled' ? 'Fulfilled / Dispensed' : item.status}
                    </span>
                  </div>
                </div>

                {item.instructions && (
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Instructions: {item.instructions}
                  </p>
                )}

                {/* Audit Attribution Box (PRD §7 & Issue #51 requirement) */}
                {item.attribution ? (
                  <div className={styles.attributionBox} aria-label="Action attribution">
                    <span aria-hidden="true">✓</span>
                    <span>
                      {item.attribution.action === 'dispensed' && 'Dispensed by '}
                      {item.attribution.action === 'sample_collected' && 'Sample collected by '}
                      {item.attribution.action === 'verified' && 'Verified by '}
                      {item.attribution.action === 'rejected' && 'Rejected by '}
                      <strong className={styles.attributionActor}>{item.attribution.performedByName}</strong>{' '}
                      ({item.attribution.performedByRole}) on{' '}
                      {new Date(item.attribution.timestamp).toLocaleString()}
                      {item.attribution.notes && ` — "${item.attribution.notes}"`}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      Pending staff action. Fulfilling or rejecting will record your staff credentials for statutory attribution.
                    </span>
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="secondary"
                        onClick={() => handleAction(item.id, 'rejected')}
                        loading={isItemUpdating}
                        disabled={isUpdating}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.3rem 0.7rem', color: '#b3261e' }}
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleAction(item.id, 'fulfilled')}
                        loading={isItemUpdating}
                        disabled={isUpdating}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.3rem 0.7rem' }}
                      >
                        {item.orderType === 'prescription' ? 'Dispense & Fulfill' : 'Collect & Fulfill'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
