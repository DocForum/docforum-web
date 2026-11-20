import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useAttachmentUrl } from '../hooks/useDisputes';
import { describeAttachmentError } from '../errors';
import { attachmentKindLabel, expiryLabel, formatBytes, formatDateTime } from '../format';
import type { DisputeAttachment, DisputeAttachmentUrl } from '../../../types/models';
import styles from './Disputes.module.css';

/**
 * Attachment links are minted per click and never held in state longer than
 * the admin needs them. `url` starts null on every mount and is replaced on
 * every re-request, so a stale or shared link can't be reopened later.
 */
function AttachmentRow({ disputeId, attachment }: { disputeId: string; attachment: DisputeAttachment }) {
  const requestLink = useAttachmentUrl(disputeId);
  const [link, setLink] = useState<DisputeAttachmentUrl | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = requestLink.isPending && requestLink.variables === attachment.id;

  async function mint() {
    setLink(null);
    setError(null);
    try {
      setLink(await requestLink.mutateAsync(attachment.id));
    } catch (cause) {
      setError(describeAttachmentError(cause));
    }
  }

  return (
    <li className={styles.attachment}>
      <div className={styles.attachmentTop}>
        <span className={styles.attachmentName}>{attachment.filename}</span>
        <span className={styles.attachmentMeta}>
          {attachmentKindLabel(attachment.kind)} · {formatBytes(attachment.sizeBytes)} · uploaded{' '}
          {formatDateTime(attachment.uploadedAt)} by {attachment.uploadedBy}
        </span>
      </div>
      <div>
        <Button variant="secondary" size="small" loading={pending} disabled={pending} onClick={() => void mint()}>
          {link ? 'Get a new secure link' : 'Get secure link'}
        </Button>
      </div>
      {link && (
        <p className={styles.signedLink}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            Open {attachment.filename}
          </a>
          <span className={styles.muted}>({expiryLabel(link.expiresAt)})</span>
        </p>
      )}
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

export function AttachmentList({ disputeId, attachments }: { disputeId: string; attachments: DisputeAttachment[] }) {
  if (attachments.length === 0) {
    return <p className={styles.muted}>No attachments were submitted.</p>;
  }

  return (
    <>
      <p className={styles.fieldHint}>
        Links are signed on demand and expire quickly. Request a fresh one each time you open a file.
      </p>
      <ul className={styles.attachments}>
        {attachments.map((attachment) => (
          <AttachmentRow key={attachment.id} disputeId={disputeId} attachment={attachment} />
        ))}
      </ul>
    </>
  );
}
