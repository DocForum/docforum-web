import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import styles from './OrderVerify.module.css';

interface ManualTokenEntryProps {
  onSubmitToken: (token: string) => void;
  isLoading?: boolean;
}

export function ManualTokenEntry({ onSubmitToken, isLoading = false }: ManualTokenEntryProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setValidationError('Please enter an order token or alphanumeric verification code.');
      return;
    }
    setValidationError(null);
    onSubmitToken(trimmed);
  };

  return (
    <form className={styles.manualForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.inputGroup}>
        <label htmlFor="order-token-input">Order Verification Token</label>
        <input
          id="order-token-input"
          type="text"
          className={styles.tokenInput}
          value={tokenInput}
          onChange={(e) => {
            setTokenInput(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="e.g. ord_tok_v1_9c28a7f4"
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
          aria-describedby="order-token-help"
        />
        <span id="order-token-help" className={styles.helperText}>
          Enter the alphanumeric token from the patient's paper or digital order document.
        </span>
      </div>

      {validationError && (
        <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
          {validationError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" loading={isLoading}>
          {isLoading ? 'Verifying token…' : 'Verify order'}
        </Button>
      </div>
    </form>
  );
}
