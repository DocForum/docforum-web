import { useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { useCreateWebhookEndpoint } from '../hooks/useIntegrations';
import { createWebhookSchema, WEBHOOK_EVENT_TYPES } from '../webhook-schema';
import type { CreatedWebhookEndpoint } from '../../../types/models';
import styles from './Integrations.module.css';

// `http://localhost` is only acceptable for local development and mock
// previews; production builds must use HTTPS (issue #287).
const ALLOW_INSECURE_LOCALHOST =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
  import.meta.env.VITE_PREVIEW_MOCKS === 'true';

const webhookSchema = createWebhookSchema({
  allowInsecureLocalhost: ALLOW_INSECURE_LOCALHOST,
});

interface CreateWebhookDialogProps {
  facilityId: string;
  onClose: () => void;
}

export function CreateWebhookDialog({ facilityId, onClose }: CreateWebhookDialogProps) {
  const form = useZodForm(webhookSchema, {
    url: '',
    events: ['order.created', 'order.assigned', 'order.fulfilled'],
  });
  const [createdEndpoint, setCreatedEndpoint] = useState<CreatedWebhookEndpoint | null>(null);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateWebhookEndpoint(facilityId);
  const { errors } = form.formState;

  const onSubmit = (data: { url: string; events: (typeof WEBHOOK_EVENT_TYPES)[number][] }) => {
    createMutation.mutate(
      { url: data.url, events: data.events },
      {
        onSuccess: (created) => {
          setCreatedEndpoint(created);
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
            <FormProvider {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              >
                <FormField
                  name="url"
                  label="Endpoint URL"
                  type="text"
                  inputMode="url"
                  placeholder="https://lab.example.test/webhooks/docforum"
                  hint="Must use HTTPS. Plain HTTP sends order and patient event data unencrypted, so only http://localhost is allowed during local development. We'll send a test event after creation."
                  autoComplete="url"
                  autoFocus
                />

                <Controller
                  control={form.control}
                  name="events"
                  render={({ field }) => (
                    <fieldset
                      className={styles.formGroup}
                      aria-invalid={Boolean(errors.events)}
                      aria-describedby={errors.events ? 'webhook-events-error' : undefined}
                    >
                      <legend className={styles.formLabel}>Events to subscribe</legend>
                      <div className={styles.eventsGrid}>
                        {WEBHOOK_EVENT_TYPES.map((event) => (
                          <label key={event} className={styles.eventCheckbox}>
                            <input
                              type="checkbox"
                              checked={field.value.includes(event)}
                              onChange={() => {
                                field.onChange(
                                  field.value.includes(event)
                                    ? field.value.filter((value) => value !== event)
                                    : [...field.value, event],
                                );
                              }}
                            />
                            <code style={{ fontSize: 'var(--text-xs)' }}>{event}</code>
                          </label>
                        ))}
                      </div>
                      {errors.events ? (
                        <p
                          id="webhook-events-error"
                          role="alert"
                          style={{
                            color: 'var(--color-danger)',
                            fontSize: 'var(--text-sm)',
                            margin: 0,
                          }}
                        >
                          {errors.events.message}
                        </p>
                      ) : (
                        <span className={styles.formHint}>Select at least one event.</span>
                      )}
                    </fieldset>
                  )}
                />

                <div className={styles.modalActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create endpoint'}
                  </Button>
                </div>
                {createMutation.isError && (
                  <p style={{ color: '#b3261e', fontSize: 'var(--text-sm)', margin: 0 }}>
                    Failed to create endpoint. Please try again.
                  </p>
                )}
              </form>
            </FormProvider>
          </>
        )}
      </div>
    </div>
  );
}
