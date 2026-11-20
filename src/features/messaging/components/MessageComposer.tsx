import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { useMessageDraftStore } from '../../../store/message-draft-store';
import type { SendMessageInput } from '../../../types/models';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { formatBytes, MAX_ATTACHMENT_BYTES } from '../attachment-validation';
import type { StagedAttachment } from '../hooks/useAttachmentUploader';
import { useAttachmentUploader } from '../hooks/useAttachmentUploader';
import { useSendMessage } from '../hooks/useMessageThread';
import styles from './MessageComposer.module.css';

interface Props {
  threadId: string;
  disabled?: boolean;
  onSent?: (messageId: string) => void;
  /** When provided, the thread owns delivery (optimistic append, failed
   * state, retry). The composer still owns the draft and attachments. */
  onSend?: (input: SendMessageInput) => Promise<void>;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export function MessageComposer({ threadId, disabled = false, onSent, onSend }: Props) {
  // PHI draft: in memory only, keyed by thread, cleared on send or logout.
  const body = useMessageDraftStore((state) => state.drafts[threadId] ?? '');
  const setDraft = useMessageDraftStore((state) => state.setDraft);
  const clearDraft = useMessageDraftStore((state) => state.clearDraft);
  const [sending, setSending] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const uploader = useAttachmentUploader(threadId);
  const sendMutation = useSendMessage(threadId);
  const attachInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const canSend =
    (body.trim().length > 0 || uploader.uploadedIds.length > 0) &&
    !uploader.isUploading &&
    !sendMutation.isPending &&
    !sending &&
    !disabled;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    const input: SendMessageInput = {
      body: body.trim(),
      attachmentIds: uploader.uploadedIds.length ? uploader.uploadedIds : undefined,
    };

    setDeliveryError(null);

    if (onSend) {
      setSending(true);
      try {
        await onSend(input);
        // The message is now in the thread's outbox; the draft has served
        // its purpose.
        clearDraft(threadId);
        uploader.reset();
      } catch (error) {
        setDeliveryError(
          error instanceof ApiError ? error.message : 'Could not send. Please try again.',
        );
      } finally {
        setSending(false);
      }
      return;
    }

    sendMutation.mutate(input, {
      onSuccess: (message) => {
        clearDraft(threadId);
        uploader.reset();
        onSent?.(message.id);
      },
    });
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) uploader.addFiles(files);
    event.target.value = '';
  }

  const sendError =
    deliveryError ??
    (sendMutation.error instanceof ApiError
      ? sendMutation.error.message
      : sendMutation.error
        ? 'Could not send. Please try again.'
        : null);

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      {uploader.items.length > 0 && (
        <ul className={styles.stagedList}>
          {uploader.items.map((item) => (
            <StagedRow
              key={item.id}
              item={item}
              onCancel={() => uploader.cancelUpload(item.id)}
              onRetry={() => uploader.retryUpload(item.id)}
              onRemove={() => uploader.removeAttachment(item.id)}
            />
          ))}
        </ul>
      )}

      <FormError message={sendError} />

      <textarea
        className={styles.textarea}
        value={body}
        onChange={(event) => setDraft(threadId, event.target.value)}
        placeholder="Write a message…"
        aria-label="Message"
        rows={3}
        disabled={disabled}
      />

      <div className={styles.actions}>
        <input
          ref={attachInput}
          className={styles.hiddenInput}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFiles}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={cameraInput}
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFiles}
          aria-hidden="true"
          tabIndex={-1}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => attachInput.current?.click()}
          disabled={disabled || uploader.isAtCapacity}
        >
          Attach file
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => cameraInput.current?.click()}
          disabled={disabled || uploader.isAtCapacity}
        >
          Take photo
        </Button>
        <span className={styles.hint}>JPEG, PNG, WebP or PDF · up to {formatBytes(MAX_ATTACHMENT_BYTES)}</span>
        <Button type="submit" loading={sendMutation.isPending || sending} disabled={!canSend}>
          Send
        </Button>
      </div>
    </form>
  );
}

function StagedRow({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: StagedAttachment;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={styles.stagedRow}>
      <div className={styles.stagedMain}>
        <span className={styles.stagedName}>{item.fileName}</span>
        {item.status === 'uploading' && (
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressBar} style={{ width: `${item.progress}%` }} />
          </div>
        )}
        {item.status === 'done' && <span className={styles.stagedDone}>Uploaded</span>}
        {item.status === 'cancelled' && <span className={styles.stagedError}>Cancelled</span>}
        {item.status === 'error' && (
          <span className={styles.stagedError} role="alert">
            {item.error}
          </span>
        )}
      </div>

      <div className={styles.stagedActions}>
        {item.status === 'uploading' && (
          <button type="button" className={styles.linkButton} onClick={onCancel}>
            Cancel
          </button>
        )}
        {(item.status === 'error' || item.status === 'cancelled') && (
          <button type="button" className={styles.linkButton} onClick={onRetry}>
            Retry
          </button>
        )}
        <button type="button" className={styles.linkButton} onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}
