import { useState } from 'react';
import { OrderScanner } from './OrderScanner';
import { ManualTokenEntry } from './ManualTokenEntry';
import { VerificationResultCard } from './VerificationResultCard';
import { useOrderVerify } from '../hooks/useOrderVerify';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/Button';
import type { VerifyOrderResponse } from '../../../types/models';
import styles from './OrderVerify.module.css';

export function OrderVerifyView() {
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [result, setResult] = useState<VerifyOrderResponse | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const verifyMutation = useOrderVerify();

  const handleVerifyToken = async (token: string) => {
    setRateLimitMessage(null);
    try {
      const res = await verifyMutation.mutateAsync(token);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitMessage(err.message);
      } else {
        const error = err as Error;
        if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate-limited')) {
          setRateLimitMessage(error.message);
        }
      }
    }
  };

  const handleReset = () => {
    setResult(null);
    setRateLimitMessage(null);
    verifyMutation.reset();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Scan to verify order</h1>
        <p className={styles.subtitle}>
          Scan a patient's QR code or enter the order verification token to validate authenticity,
          expiration, and eligibility before fulfillment.
        </p>
      </div>

      {rateLimitMessage && (
        <div role="alert" className={styles.rateLimitCard}>
          <h3 className={styles.rateLimitTitle}>
            <span>⚠️</span> Rate Limit Exceeded (429)
          </h3>
          <p className={styles.rateLimitDesc}>{rateLimitMessage}</p>
          <div>
            <Button variant="secondary" onClick={handleReset}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {result ? (
        <VerificationResultCard result={result} onReset={handleReset} />
      ) : (
        <>
          <div className={styles.modeToggle} role="tablist" aria-label="Verification input mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'camera'}
              className={`${styles.modeButton} ${activeMode === 'camera' ? styles.modeButtonActive : ''}`}
              onClick={() => setActiveMode('camera')}
            >
              📷 Camera scanner
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'manual'}
              className={`${styles.modeButton} ${activeMode === 'manual' ? styles.modeButtonActive : ''}`}
              onClick={() => setActiveMode('manual')}
            >
              ⌨️ Manual code entry
            </button>
          </div>

          {verifyMutation.isPending && (
            <div role="status" className={`${styles.alert} ${styles.alertInfo}`}>
              Checking order token against DocForum core registry…
            </div>
          )}

          {verifyMutation.isError && !rateLimitMessage && (
            <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
              <strong>Verification Failed:</strong> {verifyMutation.error.message || 'Unable to verify order token.'}
            </div>
          )}

          {activeMode === 'camera' ? (
            <OrderScanner
              onScan={handleVerifyToken}
              onSwitchToManual={() => setActiveMode('manual')}
              isVerifying={verifyMutation.isPending}
            />
          ) : (
            <ManualTokenEntry
              onSubmitToken={handleVerifyToken}
              isLoading={verifyMutation.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}
