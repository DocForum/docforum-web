import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useCredentialUpload } from '../hooks/useCredentialUpload';
import {
  CREDENTIAL_TYPE_HINT,
  credentialAcceptAttribute,
  credentialTypeOptions,
  formatBytes,
  isCredentialType,
  validateCredentialFile,
  validateCredentialType,
} from '../requirements';
import styles from './CredentialUploadForm.module.css';

const TYPE_OPTIONS = credentialTypeOptions();

interface Props {
  /** Called after the backend accepts a credential, so the page can refetch
   * whatever it renders from the query cache. */
  onUploaded?: () => void;
}

export function CredentialUploadForm({ onUploaded }: Props) {
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
    setValidationError(selected ? validateCredentialFile(selected) : null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateCredentialFile(file) ?? validateCredentialType(type);
    if (message !== null || file === null || !isCredentialType(type)) {
      setValidationError(message ?? 'Choose a document and its type.');
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
  const apiMessage = error ? error.message || 'The upload failed. Check your connection and try again.' : null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.title}>Upload a credential</h3>
      <p className={styles.hint} id={hintId}>
        {CREDENTIAL_TYPE_HINT} The list below is the current review policy — it is not a rule the server stores per
        application.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fileFieldId}>
          Document file
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
          {file ? `${file.name} (${formatBytes(file.size)})` : 'No document chosen.'}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={typeFieldId}>
          Document type
        </label>
        <select
          className={styles.select}
          id={typeFieldId}
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={isPending}
        >
          <option value="">Choose a document type</option>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.required ? ' (required)' : ' (optional)'}
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
              ? `Sent ${formatBytes(progress.totalBytes)} — waiting for the server to record it.`
              : `Uploading: ${formatBytes(progress.loadedBytes)} of ${formatBytes(progress.totalBytes)} (${progress.percent}%)`}
          </span>
        </div>
      )}

      {uploadedFileName && (
        <p className={styles.success} role="status">
          {uploadedFileName} uploaded — now pending review.
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={isPending}>
          Upload document
        </Button>
        {isPending && (
          <Button type="button" variant="secondary" onClick={abort}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
