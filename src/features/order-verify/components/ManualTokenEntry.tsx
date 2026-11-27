import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';
import styles from './OrderVerify.module.css';

interface ManualTokenEntryProps {
  onSubmitToken: (token: string) => void;
  isLoading?: boolean;
}

export function ManualTokenEntry({ onSubmitToken, isLoading = false }: ManualTokenEntryProps) {
  const t = useT();
  const [tokenInput, setTokenInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setValidationError(t('orderVerify.manual.tokenRequired', 'Please enter an order token or alphanumeric verification code.'));
      return;
    }
    setValidationError(null);
    onSubmitToken(trimmed);
  };

  return (
    <form className={styles.manualForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.inputGroup}>
        <label htmlFor="order-token-input">{t('orderVerify.manual.tokenLabel', 'Order Verification Token')}</label>
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
          {t('orderVerify.manual.tokenHelp', "Enter the alphanumeric token from the patient's paper or digital order document.")}
        </span>
      </div>

      {validationError && (
        <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
          {validationError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" loading={isLoading}>
          {isLoading ? t('orderVerify.manual.verifying', 'Verifying token…') : t('orderVerify.manual.verify', 'Verify order')}
        </Button>
      </div>
    </form>
  );
}
