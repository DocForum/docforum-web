import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useCredentialResubmit, useDeleteCredential } from '../hooks/useCredentialUpload';
import { useT } from '../../../i18n/useT';
import {
  claimItemStatusLabel,
  credentialTypeHint,
  credentialTypeLabel,
  credentialAcceptAttribute,
  formatBytes,
  noRejectionReason,
  validateCredentialFile,
} from '../requirements';
import type { ClaimItemStatus, DoctorCredential } from '../../../types/models';
import styles from './CredentialList.module.css';
import { formatInstant } from '../../../i18n/format';

interface Props {
  credentials: readonly DoctorCredential[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function formatDate(iso: string): string {
  return formatInstant(iso, { year: 'numeric', month: 'short', day: 'numeric' });
}

function rejectionMessage(error: Error | null, fallback: string): string | null {
  if (!error) return null;
  // The server sentence is the most useful thing a doctor can act on, so it is
  // never swapped out for a generic one; only a truly empty message falls back.
  return error.message || fallback;
}

function StatusTag({ status }: { status: ClaimItemStatus }) {
  const t = useT();
  return (
    <span className={styles.status} data-status={status}>
      {claimItemStatusLabel(status, t)}
    </span>
  );
}

interface ResubmitFormProps {
  credential: DoctorCredential;
  onClose: () => void;
}

/** A rejected row is replaced, not re-created: the endpoint takes the new file
 * against the existing credential id, so the review history stays intact. */
function ResubmitForm({ credential, onClose }: ResubmitFormProps) {
  const t = useT();
  const { resubmit, isPending, error, progress, abort } = useCredentialResubmit();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputId = useId();
  const progressLabelId = useId();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setValidationError(selected ? validateCredentialFile(selected, t) : null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateCredentialFile(file, t);
    if (message !== null || file === null) {
      setValidationError(message ?? t('verification.list.replacementRequired', 'Choose a replacement file.'));
      return;
    }
    setValidationError(null);
    resubmit({ credentialId: credential.id, file }, { onSuccess: onClose });
  }

  return (
    <form className={styles.resubmitForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {t('verification.list.replacementLabel', 'Replacement file for {name}', {
            name: credential.fileName,
          })}
        </label>
        <input
          className={styles.file}
          id={inputId}
          type="file"
          accept={credentialAcceptAttribute()}
          onChange={handleFileChange}
          disabled={isPending}
          aria-describedby={`${inputId}-hint`}
        />
        <span className={styles.hint} id={`${inputId}-hint`}>
          {credentialTypeHint(t)}
        </span>
      </div>

      <FormError
        message={
          validationError ??
          rejectionMessage(error, t('verification.list.resubmitFailed', 'The resubmission failed. Try again.'))
        }
      />

      {isPending && (
        <div className={styles.progress}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby={progressLabelId}
          >
            <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
          </div>
          <span className={styles.progressLabel} id={progressLabelId}>
            {t('verification.list.sendingReplacement', 'Sending replacement: {loaded} of {total} ({percent}%)', {
              loaded: formatBytes(progress.loadedBytes),
              total: formatBytes(progress.totalBytes),
              percent: progress.percent,
            })}
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={isPending}>
          {t('verification.list.resubmit', 'Resubmit for review')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => (isPending ? abort() : onClose())}>
          {isPending
            ? t('verification.list.cancelUpload', 'Cancel upload')
            : t('common.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  );
}

export function CredentialList({ credentials, isLoading, error, onRetry }: Props) {
  const t = useT();
  const deleteMutation = useDeleteCredential();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton lines={3} label={t('verification.list.loading', 'Loading your documents…')} />;
  }

  if (error) {
    return <InlineError title="Your documents couldn't be loaded" message={error} onRetry={onRetry} />;
  }

  if (credentials.length === 0) {
    return (
      <EmptyState
        title={t('verification.list.empty', 'No documents uploaded yet.')}
        description={t(
          'verification.list.emptyHint',
          'Upload each required document above to start the review. Files are read by reviewers through a get-on-demand link only — this list never shows a permanent URL.',
        )}
        action={{ label: 'Upload a document', onClick: () => document.getElementById('credential-upload')?.scrollIntoView() }}
      />
    );
  }

  return (
    <div className={styles.root}>
      <ul className={styles.list}>
        {credentials.map((credential) => (
          <li key={credential.id} className={styles.item} data-status={credential.status}>
            <div className={styles.itemHeader}>
              <span className={styles.fileName}>{credential.fileName}</span>
              <StatusTag status={credential.status} />
            </div>

            <dl className={styles.meta}>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>{t('verification.list.col.type', 'Type')}</dt>
                <dd className={styles.metaValue}>{credentialTypeLabel(credential.type, t)}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>{t('verification.list.col.size', 'Size')}</dt>
                <dd className={styles.metaValue}>{formatBytes(credential.sizeBytes)}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>{t('verification.list.col.fileType', 'File type')}</dt>
                <dd className={styles.metaValue}>{credential.mimeType}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>{t('verification.list.col.submitted', 'Submitted')}</dt>
                <dd className={styles.metaValue}>{formatDate(credential.submittedAt)}</dd>
              </div>
            </dl>

            {credential.status === 'rejected' && (
              <>
                <p className={styles.reason}>
                  <span className={styles.reasonLabel}>{t('verification.reason.label', 'Reason: ')}</span>
                  {credential.rejectionReason || noRejectionReason(t)}
                </p>
                {openId === credential.id ? (
                  <ResubmitForm credential={credential} onClose={() => setOpenId(null)} />
                ) : (
                  <Button variant="secondary" onClick={() => setOpenId(credential.id)}>
                    {t('verification.list.resubmitDocument', 'Resubmit document')}
                  </Button>
                )}
              </>
            )}

            {/* A verified document is settled — no resubmit, no removal. */}
            {credential.status !== 'verified' && (
              <Button
                variant="secondary"
                onClick={() => deleteMutation.mutate({ credentialId: credential.id })}
                loading={deleteMutation.isPending && deleteMutation.variables?.credentialId === credential.id}
              >
                {t('verification.list.remove', 'Remove')}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <FormError
        message={rejectionMessage(
          deleteMutation.error ?? null,
          t('verification.list.removeFailed', 'Could not remove that document.'),
        )}
      />

      <p className={styles.storageNote}>
        {t(
          'verification.list.storageNote',
          'Reviewers open these files through a get-on-demand link. The application never shows a permanent URL for an uploaded document.',
        )}
      </p>
    </div>
  );
}
