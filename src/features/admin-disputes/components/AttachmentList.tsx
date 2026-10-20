import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useAttachmentUrl } from '../hooks/useDisputes';
import { describeAttachmentError } from '../errors';
import { formatFileSize } from '../queue';
import type { DisputeAttachment } from '../../../types/models';
import styles from './Disputes.module.css';

interface AttachmentListProps {
  disputeId: string;
  attachments: DisputeAttachment[];
}

function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Evidence files are never rendered as links. Each open asks docforum-core
 * for a fresh short-lived signed URL (a POST, so it can't be cached) and
 * uses it immediately; nothing is kept in state or storage.
 */
export function AttachmentList({ disputeId, attachments }: AttachmentListProps) {
  const link = useAttachmentUrl();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openAttachment(attachment: DisputeAttachment) {
    setError(null);
    setOpeningId(attachment.id);
    try {
      const { url } = await link.mutateAsync({ disputeId, attachmentId: attachment.id });
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        setError(
          'Your browser blocked the attachment window. Allow pop-ups for DocForum and try again — a new link will be minted.',
        );
      }
    } catch (caught) {
      setError(describeAttachmentError(caught));
    } finally {
      setOpeningId(null);
    }
  }

  if (attachments.length === 0) {
    return <p className={styles.inlineEmpty}>No attachments were provided.</p>;
  }

  return (
    <div className={styles.attachments}>
      <p className={styles.fieldHint}>
        Each open requests a fresh signed URL from docforum-core. Links expire and are never stored.
      </p>
      <ul className={styles.attachmentList}>
        {attachments.map((attachment) => (
          <li key={attachment.id} className={styles.attachment}>
            <div className={styles.attachmentText}>
              <span className={styles.attachmentName}>{attachment.fileName}</span>
              <span className={styles.attachmentMeta}>
                {formatFileSize(attachment.sizeBytes)} · uploaded by the {attachment.uploadedBy} on{' '}
                <time dateTime={attachment.uploadedAt}>{formatUploadedAt(attachment.uploadedAt)}</time>
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={openingId === attachment.id}
              disabled={link.isPending}
              onClick={() => void openAttachment(attachment)}
              aria-label={`Open ${attachment.fileName}`}
            >
              {openingId === attachment.id ? 'Opening…' : 'Open attachment'}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
