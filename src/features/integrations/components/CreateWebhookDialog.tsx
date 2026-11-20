import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useCreateWebhookEndpoint } from '../hooks/useIntegrations';
import type { CreatedWebhookEndpoint, WebhookEventType } from '../../../types/models';
import styles from './Integrations.module.css';

const ALL_EVENTS: WebhookEventType[] = [
  'order.created',
  'order.assigned',
  'order.fulfilled',
  'order.cancelled',
  'payment.released',
  'payment.refunded',
];

interface CreateWebhookDialogProps {
  facilityId: string;
  onClose: () => void;
}

export function CreateWebhookDialog({ facilityId, onClose }: CreateWebhookDialogProps) {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEventType>>(
    new Set(['order.created', 'order.assigned', 'order.fulfilled']),
  );
  const [createdEndpoint, setCreatedEndpoint] = useState<CreatedWebhookEndpoint | null>(null);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateWebhookEndpoint(facilityId);

  const toggleEvent = (event: WebhookEventType) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  };

  const isValidUrl = () => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl() || selectedEvents.size === 0) return;

    createMutation.mutate(
      { url: url.trim(), events: Array.from(selectedEvents) },
      {
        onSuccess: (data) => {
          setCreatedEndpoint(data);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!createdEndpoint) return;
    try {
      await navigator.clipboard.writeText(createdEndpoint.signingSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — user can select and copy manually
    }
  };

  const handleDone = () => {
    // Drop the signing secret from the mutation cache before unmounting.
    createMutation.reset();
    setCreatedEndpoint(null);
    onClose();
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-webhook-title"
    >
      <div className={styles.modalContent}>
        {createdEndpoint ? (
          <>
            <h3 id="create-webhook-title">Webhook endpoint created</h3>
            <div className={styles.secretWarning}>
              <span aria-hidden="true">⚠️</span>
              <span>
                Copy this signing secret now. For security, it will never be shown again.
                Use it to verify that deliveries are genuinely from DocForum (HMAC-SHA256).
              </span>
            </div>
            <div className={styles.secretBox}>
              <span className={styles.secretValue}>{createdEndpoint.signingSecret}</span>
              <button
                type="button"
                className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className={styles.modalActions}>
              <Button onClick={handleDone}>I have saved the secret</Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="create-webhook-title">Add webhook endpoint</h3>
            <p className={styles.modalDescription}>
              DocForum will send signed HTTP POST requests to this URL when the
              selected events occur.
            </p>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              <div className={styles.formGroup}>
                <label htmlFor="webhook-url" className={styles.formLabel}>
                  Endpoint URL
                </label>
                <input
                  id="webhook-url"
                  type="url"
                  className={styles.formInput}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://lab.example.test/webhooks/docforum"
                  required
                  autoFocus
                />
                <span className={styles.formHint}>
                  Must be HTTPS in production. We&apos;ll send a test event after creation.
                </span>
              </div>

              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Events to subscribe</span>
                <div className={styles.eventsGrid}>
                  {ALL_EVENTS.map((event) => (
                    <label key={event} className={styles.eventCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedEvents.has(event)}
                        onChange={() => toggleEvent(event)}
                      />
                      <code style={{ fontSize: 'var(--text-xs)' }}>{event}</code>
                    </label>
                  ))}
                </div>
                {selectedEvents.size === 0 && (
                  <span className={styles.formHint} style={{ color: '#b3261e' }}>
                    Select at least one event.
                  </span>
                )}
              </div>

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={!isValidUrl() || selectedEvents.size === 0}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create endpoint'}
                </Button>
              </div>
              {createMutation.isError && (
                <p style={{ color: '#b3261e', fontSize: 'var(--text-sm)', margin: 0 }}>
                  Failed to create endpoint. Please try again.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
