import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useCredentialUpload } from '../hooks/useCredentialUpload';
import { useT } from '../../../i18n/useT';
import {
  credentialAcceptAttribute,
  credentialTypeOptions,
  formatBytes,
  isCredentialType,
  MAX_CREDENTIAL_BYTES,
  validateCredentialFile,
  validateCredentialType,
} from '../requirements';
import styles from './CredentialUploadForm.module.css';

interface Props {
  /** Called after the backend accepts a credential, so the page can refetch
   * whatever it renders from the query cache. */
  onUploaded?: () => void;
}

export function CredentialUploadForm({ onUploaded }: Props) {
  const t = useT();
  const { upload, isPending, error, progress, abort } = useCredentialUpload();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  // Uncontrolled file inputs keep their own display value, so a successful
  // upload remounts the input instead of showing a filename that is gone.
  const [fileFieldKey, setFileFieldKey] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileFieldId = useId();
  const typeFieldId = useId();
  const hintId = useId();
  const progressLabelId = useId();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setUploadedFileName(null);
    // Validate on pick, not only on submit: nobody should click Upload with a
    // 40 MB scan already in the box and wonder why nothing happened.
    setValidationError(selected ? validateCredentialFile(selected, t) : null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateCredentialFile(file, t) ?? validateCredentialType(type, t);
    if (message !== null || file === null || !isCredentialType(type)) {
      setValidationError(message ?? t('verification.upload.documentAndType', 'Choose a document and its type.'));
      return;
    }
    setValidationError(null);
    const uploaded = file.name;
    upload({ file, type }, () => {
      setFile(null);
      setType('');
      setFileFieldKey((key) => key + 1);
      setUploadedFileName(uploaded);
      onUploaded?.();
    });
  }

  // The server's own reason is always the more useful sentence; the fallback
  // is only for a rejection that comes back without one.
  const apiMessage = error
    ? error.message || t('verification.upload.uploadFailed', 'The upload failed. Check your connection and try again.')
    : null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.title}>{t('verification.upload.title', 'Upload a credential')}</h3>
      <p className={styles.hint} id={hintId}>
        {t(
          'verification.upload.hint',
          'PDF, JPEG, or PNG, up to {max}. The list below is the current review policy — it is not a rule the server stores per application.',
          { max: formatBytes(MAX_CREDENTIAL_BYTES) },
        )}
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fileFieldId}>
          {t('verification.upload.documentFile', 'Document file')}
        </label>
        <input
          className={styles.file}
          key={fileFieldKey}
          id={fileFieldId}
          type="file"
          accept={credentialAcceptAttribute()}
          onChange={handleFileChange}
          disabled={isPending}
          aria-describedby={hintId}
          aria-invalid={validationError !== null}
        />
        <span className={styles.selected} aria-live="polite">
          {file
            ? `${file.name} (${formatBytes(file.size)})`
            : t('verification.upload.noDocument', 'No document chosen.')}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={typeFieldId}>
          {t('verification.upload.documentType', 'Document type')}
        </label>
        <select
          className={styles.select}
          id={typeFieldId}
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={isPending}
        >
          <option value="">{t('verification.upload.chooseType', 'Choose a document type')}</option>
          {credentialTypeOptions(t).map((option) => (
            <option key={option.value} value={option.value}>
              {option.required
                ? t('verification.upload.requiredOption', '{label} (required)', { label: option.label })
                : t('verification.upload.optionalOption', '{label} (optional)', { label: option.label })}
            </option>
          ))}
        </select>
      </div>

      <FormError message={validationError ?? apiMessage} />

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
            {progress.loadedBytes >= progress.totalBytes && progress.totalBytes > 0
              ? t('verification.upload.sentWaiting', 'Sent {size} — waiting for the server to record it.', {
                  size: formatBytes(progress.totalBytes),
                })
              : t('verification.upload.uploading', 'Uploading: {loaded} of {total} ({percent}%)', {
                  loaded: formatBytes(progress.loadedBytes),
                  total: formatBytes(progress.totalBytes),
                  percent: progress.percent,
                })}
          </span>
        </div>
      )}

      {uploadedFileName && (
        <p className={styles.success} role="status">
          {t('verification.upload.success', '{name} uploaded — now pending review.', { name: uploadedFileName })}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={isPending}>
          {t('verification.upload.submit', 'Upload document')}
        </Button>
        {isPending && (
          <Button type="button" variant="secondary" onClick={abort}>
            {t('common.cancel', 'Cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
