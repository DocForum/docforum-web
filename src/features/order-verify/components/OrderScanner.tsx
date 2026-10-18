import { useCameraQrScanner } from '../hooks/useCameraQrScanner';
import { Button } from '../../../components/Button';
import styles from './OrderVerify.module.css';

interface OrderScannerProps {
  onScan: (token: string) => void;
  onSwitchToManual: () => void;
  isVerifying?: boolean;
}

export function OrderScanner({ onScan, onSwitchToManual, isVerifying = false }: OrderScannerProps) {
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
          <strong>Camera Access Notice</strong>
          <span>{errorMessage}</span>
          {cameraStatus === 'denied' && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={onSwitchToManual}>
                Switch to manual entry
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
          aria-label="Order QR camera viewfinder"
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
            Pause camera
          </Button>
        ) : (
          <Button variant="secondary" onClick={startCamera}>
            Resume camera
          </Button>
        )}
        <Button variant="secondary" onClick={onSwitchToManual}>
          Manual code entry
        </Button>
      </div>
    </div>
  );
}
