import { useEffect, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { MessageAttachment } from '../../../types/models';
import { formatBytes } from '../attachment-validation';
import styles from './AttachmentPreview.module.css';

interface Props {
  threadId: string;
  attachment: MessageAttachment;
}

/** Inline image preview or PDF chip for one message attachment. Clicking
 * mints a *fresh* short-lived signed URL and opens it — the preview URL is
 * held only in component state, never in React Query's cache, and is never
 * reused for the download. */
export function AttachmentPreview({ threadId, attachment }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isImage = attachment.kind === 'image';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage || !accessToken) return;
    let active = true;
    messagingService
      .requestAttachmentDownloadUrl(threadId, attachment.id, accessToken)
      .then(({ url }) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });
    return () => {
      active = false;
    };
  }, [isImage, threadId, attachment.id, accessToken]);

  async function handleOpen() {
    if (!accessToken || opening) return;
    setOpening(true);
    setError(null);
    try {
      const { url } = await messagingService.requestAttachmentDownloadUrl(threadId, attachment.id, accessToken);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Download failed. Please try again.');
    } finally {
      setOpening(false);
    }
  }

  if (isImage) {
    return (
      <figure className={styles.imageFigure}>
        <button
          type="button"
          className={styles.imageButton}
          onClick={handleOpen}
          disabled={opening}
          aria-label={`Open ${attachment.fileName}`}
        >
          {previewUrl ? (
            <img className={styles.image} src={previewUrl} alt={attachment.fileName} loading="lazy" />
          ) : (
            <span className={styles.imagePlaceholder} aria-hidden="true" />
          )}
        </button>
        {error && (
          <figcaption className={styles.error} role="alert">
            {error}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <div className={styles.pdfRow}>
      <button type="button" className={styles.pdfChip} onClick={handleOpen} disabled={opening}>
        <span className={styles.pdfBadge} aria-hidden="true">
          PDF
        </span>
        <span className={styles.pdfName}>{attachment.fileName}</span>
        <span className={styles.pdfSize}>{formatBytes(attachment.sizeBytes)}</span>
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
