import { useCameraQrScanner } from '../hooks/useCameraQrScanner';
import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';
import styles from './OrderVerify.module.css';

interface OrderScannerProps {
  onScan: (token: string) => void;
  onSwitchToManual: () => void;
  isVerifying?: boolean;
}

export function OrderScanner({ onScan, onSwitchToManual, isVerifying = false }: OrderScannerProps) {
  const t = useT();
  const {
    videoRef,
    cameraStatus,
    errorMessage,
    isScanning,
    startCamera,
    stopCamera,
  } = useCameraQrScanner({
    onScan,
    enabled: !isVerifying,
  });

  return (
    <div className={styles.scannerCard}>
      {errorMessage && (
        <div
          role="alert"
          className={`${styles.alert} ${
            cameraStatus === 'denied' || cameraStatus === 'error' ? styles.alertError : styles.alertWarning
          }`}
        >
          <strong>{t('orderVerify.scanner.noticeTitle', 'Camera Access Notice')}</strong>
          <span>{errorMessage}</span>
          {cameraStatus === 'denied' && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={onSwitchToManual}>
                {t('orderVerify.scanner.switchManual', 'Switch to manual entry')}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={styles.viewfinderWrapper}>
        <video
          ref={videoRef}
          className={styles.videoFeed}
          playsInline
          muted
          aria-label={t('orderVerify.scanner.viewfinderLabel', 'Order QR camera viewfinder')}
        />
        {isScanning && (
          <div className={styles.reticle} aria-hidden="true">
            <div className={styles.scanBeam} />
          </div>
        )}
      </div>

      <div className={styles.scannerControls}>
        {isScanning ? (
          <Button variant="secondary" onClick={stopCamera}>
            {t('orderVerify.scanner.pauseCamera', 'Pause camera')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={startCamera}>
            {t('orderVerify.scanner.resumeCamera', 'Resume camera')}
          </Button>
        )}
        <Button variant="secondary" onClick={onSwitchToManual}>
          {t('orderVerify.scanner.manualEntry', 'Manual code entry')}
        </Button>
      </div>
    </div>
  );
}
