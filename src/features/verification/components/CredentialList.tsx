import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useCredentialResubmit, useDeleteCredential } from '../hooks/useCredentialUpload';
import {
  CLAIM_ITEM_STATUS_LABELS,
  CREDENTIAL_TYPE_HINT,
  CREDENTIAL_TYPE_LABELS,
  credentialAcceptAttribute,
  formatBytes,
  NO_REJECTION_REASON,
  validateCredentialFile,
} from '../requirements';
import type { ClaimItemStatus, DoctorCredential } from '../../../types/models';
import styles from './CredentialList.module.css';

interface Props {
  credentials: readonly DoctorCredential[];
  isLoading: boolean;
  error: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function rejectionMessage(error: Error | null, fallback: string): string | null {
  if (!error) return null;
  // The server sentence is the most useful thing a doctor can act on, so it is
  // never swapped out for a generic one; only a truly empty message falls back.
  return error.message || fallback;
}

function StatusTag({ status }: { status: ClaimItemStatus }) {
  return (
    <span className={styles.status} data-status={status}>
      {CLAIM_ITEM_STATUS_LABELS[status]}
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
  const { resubmit, isPending, error, progress, abort } = useCredentialResubmit();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputId = useId();
  const progressLabelId = useId();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setValidationError(selected ? validateCredentialFile(selected) : null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateCredentialFile(file);
    if (message !== null || file === null) {
      setValidationError(message ?? 'Choose a replacement file.');
      return;
    }
    setValidationError(null);
    resubmit({ credentialId: credential.id, file }, { onSuccess: onClose });
  }

  return (
    <form className={styles.resubmitForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          Replacement file for {credential.fileName}
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
          {CREDENTIAL_TYPE_HINT}
        </span>
      </div>

      <FormError message={validationError ?? rejectionMessage(error, 'The resubmission failed. Try again.')} />

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
            Sending replacement: {formatBytes(progress.loadedBytes)} of {formatBytes(progress.totalBytes)} (
            {progress.percent}%)
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={isPending}>
          Resubmit for review
        </Button>
        <Button type="button" variant="secondary" onClick={() => (isPending ? abort() : onClose())}>
          {isPending ? 'Cancel upload' : 'Cancel'}
        </Button>
      </div>
    </form>
  );
}

export function CredentialList({ credentials, isLoading, error }: Props) {
  const deleteMutation = useDeleteCredential();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return <p className={styles.placeholder}>Loading your documents…</p>;
  }

  if (error) {
    return <FormError message={error} />;
  }

  if (credentials.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No documents uploaded yet.</p>
        <p className={styles.placeholder}>
          Upload each required document above to start the review. Files are read by reviewers through a
          get-on-demand link only — this list never shows a permanent URL.
        </p>
      </div>
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
                <dt className={styles.metaKey}>Type</dt>
                <dd className={styles.metaValue}>{CREDENTIAL_TYPE_LABELS[credential.type]}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>Size</dt>
                <dd className={styles.metaValue}>{formatBytes(credential.sizeBytes)}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>File type</dt>
                <dd className={styles.metaValue}>{credential.mimeType}</dd>
              </div>
              <div className={styles.metaPair}>
                <dt className={styles.metaKey}>Submitted</dt>
                <dd className={styles.metaValue}>{formatDate(credential.submittedAt)}</dd>
              </div>
            </dl>

            {credential.status === 'rejected' && (
              <>
                <p className={styles.reason}>
                  <span className={styles.reasonLabel}>Reason: </span>
                  {credential.rejectionReason || NO_REJECTION_REASON}
                </p>
                {openId === credential.id ? (
                  <ResubmitForm credential={credential} onClose={() => setOpenId(null)} />
                ) : (
                  <Button variant="secondary" onClick={() => setOpenId(credential.id)}>
                    Resubmit document
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
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      <FormError
        message={rejectionMessage(deleteMutation.error ?? null, 'Could not remove that document.')}
      />

      <p className={styles.storageNote}>
        Reviewers open these files through a get-on-demand link. The application never shows a permanent URL for an
        uploaded document.
      </p>
    </div>
  );
}
