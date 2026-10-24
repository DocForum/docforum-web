import { useCallback, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../../components/Button';
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
  disabledReason?: string;
  onSent?: (messageId: string) => void;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_LENGTH = 4000;

export function MessageComposer({ threadId, disabled = false, disabledReason, onSent }: Props) {
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const uploader = useAttachmentUploader(threadId);
  const sendMutation = useSendMessage(threadId);
  const attachInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const canSend =
    (body.trim().length > 0 || uploader.uploadedIds.length > 0) &&
    !uploader.isUploading &&
    !sendMutation.isPending &&
    !disabled;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend) return;
      const trimmed = body.trim();
      if (trimmed.length > MAX_LENGTH) {
        setLocalError(`Messages are limited to ${MAX_LENGTH} characters.`);
        return;
      }
      setLocalError(null);
      sendMutation.mutate(
        {
          body: trimmed,
          attachmentIds: uploader.uploadedIds.length ? uploader.uploadedIds : undefined,
        },
        {
          onSuccess: (message) => {
            setBody('');
            uploader.reset();
            onSent?.(message.id);
          },
        },
      );
    },
    [body, canSend, sendMutation, uploader, onSent],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
      }
    },
    [handleSubmit],
  );

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) uploader.addFiles(files);
    event.target.value = '';
  }

  const sendError =
    sendMutation.error instanceof ApiError
      ? sendMutation.error.message
      : sendMutation.error
        ? 'Could not send. Please try again.'
        : null;

  if (disabled) {
    return (
      <div className={styles.composerDisabled} role="status">
        {disabledReason ?? 'This consultation thread is closed.'}
      </div>
    );
  }

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

      <label className={styles.composerLabel} htmlFor="message-composer-input">
        Message
      </label>
      <textarea
        id="message-composer-input"
        className={styles.textarea}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message…"
        aria-label="Message"
        rows={3}
        maxLength={MAX_LENGTH + 1}
        disabled={disabled || sendMutation.isPending}
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
        <span className={styles.hint}>
          JPEG, PNG, WebP or PDF · up to {formatBytes(MAX_ATTACHMENT_BYTES)}
        </span>
        <span className={styles.composerHint}>
          {sendMutation.isPending ? 'Sending…' : 'Enter to send, shift+Enter for a new line'}
        </span>
        <Button type="submit" loading={sendMutation.isPending} disabled={!canSend}>
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>

      {localError ? (
        <p className={styles.composerError} role="alert">
          {localError}
        </p>
      ) : null}
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
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
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