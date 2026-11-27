import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useAttachmentUrl } from '../hooks/useDisputes';
import { describeAttachmentError } from '../errors';
import { attachmentKindLabel, expiryLabel, formatBytes } from '../format';
import type { DisputeAttachment, DisputeAttachmentUrl } from '../../../types/models';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import styles from './Disputes.module.css';

/**
 * Attachment links are minted per click and never held in state longer than
 * the admin needs them. `url` starts null on every mount and is replaced on
 * every re-request, so a stale or shared link can't be reopened later.
 */
function AttachmentRow({ disputeId, attachment }: { disputeId: string; attachment: DisputeAttachment }) {
  const t = useT();
  const { dateTime } = useFormatters();
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
      setError(describeAttachmentError(cause, t));
    }
  }

  return (
    <li className={styles.attachment}>
      <div className={styles.attachmentTop}>
        <span className={styles.attachmentName}>{attachment.filename}</span>
        <span className={styles.attachmentMeta}>
          {attachmentKindLabel(attachment.kind, t)} · {formatBytes(attachment.sizeBytes, t)} ·{' '}
          {t('adminDisputes.attachment.uploaded', 'uploaded {date} by {name}', {
            date: dateTime(attachment.uploadedAt),
            name: attachment.uploadedBy,
          })}
        </span>
      </div>
      <div>
        <Button variant="secondary" size="small" loading={pending} disabled={pending} onClick={() => void mint()}>
          {link
            ? t('adminDisputes.attachment.newLink', 'Get a new secure link')
            : t('adminDisputes.attachment.getLink', 'Get secure link')}
        </Button>
      </div>
      {link && (
        <p className={styles.signedLink}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {t('adminDisputes.attachment.open', 'Open {filename}', { filename: attachment.filename })}
          </a>
          <span className={styles.muted}>({expiryLabel(link.expiresAt, Date.now(), t)})</span>
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
  const t = useT();
  if (attachments.length === 0) {
    return <p className={styles.muted}>{t('adminDisputes.attachment.empty', 'No attachments were submitted.')}</p>;
  }

  return (
    <>
      <p className={styles.fieldHint}>
        {t('adminDisputes.attachment.linkHint', 'Links are signed on demand and expire quickly. Request a fresh one each time you open a file.')}
      </p>
      <ul className={styles.attachments}>
        {attachments.map((attachment) => (
          <AttachmentRow key={attachment.id} disputeId={disputeId} attachment={attachment} />
        ))}
      </ul>
    </>
  );
}
