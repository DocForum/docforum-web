import { useId } from 'react';
import { REASON_MAX_LENGTH, normaliseReason } from '../reason';
import styles from './SpecialtyClaims.module.css';

interface ReasonFieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  disabled?: boolean;
}

export function ReasonField({ label, hint, value, onChange, error, disabled }: ReasonFieldProps) {
  const id = useId();
  const length = normaliseReason(value).length;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <p id={`${id}-hint`} className={styles.fieldHint}>
        {hint}
      </p>
      <textarea
        id={id}
        className={styles.textarea}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        // A little headroom over the limit so pasted text isn't silently cut.
        maxLength={REASON_MAX_LENGTH + 100}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint ${id}-count${error ? ` ${id}-error` : ''}`}
      />
      <div className={styles.fieldFooter}>
        {error ? (
          <p id={`${id}-error`} className={styles.fieldError} role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span id={`${id}-count`} className={length > REASON_MAX_LENGTH ? styles.countOver : styles.count}>
          {length}/{REASON_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
