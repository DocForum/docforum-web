import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useDataExport, useDownloadExport, useRequestDataExport } from '../hooks/useDataExport';
import styles from './DataExportSection.module.css';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function DataExportSection() {
  const { data: exportData, isLoading, error: queryError } = useDataExport();
  const requestMutation = useRequestDataExport();
  const { download, isDownloading, downloadError } = useDownloadExport();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setPassword('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPassword('');
    setModalError(null);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setModalError('Please enter your password to confirm re-authentication.');
      return;
    }
    setModalError(null);

    requestMutation.mutate(password, {
      onSuccess: () => {
        setIsModalOpen(false);
        setPassword('');
      },
      onError: (err) => {
        setModalError(err instanceof Error ? err.message : 'Failed to request data export');
      },
    });
  };

  const status = exportData?.status;

  return (
    <section className={styles.section} aria-labelledby="export-heading">
      <div className={styles.header}>
        <div>
          <h2 id="export-heading" className={styles.title}>
            Download my data
          </h2>
          <p className={styles.description}>
            Patients have the right to access and download a full, machine-readable copy of their personal health
            records.
          </p>
        </div>
      </div>

      <div className={styles.detailsBox}>
        <strong>What is included in your export bundle:</strong>
        <ul className={styles.detailsList}>
          <li>Profile details and verified contact records</li>
          <li>Appointment history, consultation clinical summaries, and outcomes</li>
          <li>Issued specialist referrals and fulfillment statuses</li>
          <li>Prescriptions, laboratory test diagnostic orders, and attached results</li>
          <li>Cryptographic payment intent receipts and escrow settlement logs</li>
        </ul>
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Note: Ready exports are protected and remain available for download for <strong>24 hours</strong> before
          expiring for security.
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
          <Spinner size={16} />
          <span>Checking export status…</span>
        </div>
      )}

      {queryError && <FormError message={queryError instanceof Error ? queryError.message : 'Error loading export'} />}
      {downloadError && <FormError message={downloadError} />}

      {!isLoading && !exportData && (
        <div>
          <Button type="button" onClick={handleOpenModal}>
            Request personal data export
          </Button>
        </div>
      )}

      {exportData && (
        <div className={styles.statusCard} role="status" aria-live="polite">
          <div className={styles.statusHeader}>
            <span
              className={`${styles.statusBadge} ${
                status === 'ready'
                  ? styles.statusReady
                  : status === 'expired' || status === 'failed'
                    ? styles.statusExpired
                    : styles.statusPending
              }`}
            >
              {status === 'processing' || status === 'pending'
                ? 'Processing export'
                : status === 'ready'
                  ? 'Ready for download'
                  : status === 'expired'
                    ? 'Export expired'
                    : 'Export failed'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Requested: {formatDate(exportData.requestedAt)}
            </span>
          </div>

          {(status === 'pending' || status === 'processing') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Spinner size={18} />
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Your export bundle is being generated by docforum-core. This page updates automatically when ready.
              </p>
            </div>
          )}

          {status === 'ready' && (
            <div>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)' }}>
                Your data export is ready. Download it before it expires on <strong>{formatDate(exportData.expiresAt)}</strong>.
              </p>
              <div className={styles.metaInfo} style={{ marginBottom: 'var(--space-3)' }}>
                <span>File size: {formatBytes(exportData.fileSizeBytes)}</span>
                <span>Format: JSON bundle (FHIR-compatible)</span>
              </div>
              <Button
                type="button"
                onClick={() => download(exportData.id, `docforum-export-${exportData.id}.json`)}
                loading={isDownloading}
              >
                {isDownloading ? 'Downloading…' : 'Download export file'}
              </Button>
            </div>
          )}

          {status === 'expired' && (
            <div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                This export link expired on {formatDate(exportData.expiresAt)}. For privacy and security, temporary files are removed. You can generate a fresh export anytime.
              </p>
              <Button type="button" onClick={handleOpenModal}>
                Request new export
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                Generation failed: {exportData.errorMessage ?? 'An error occurred while compiling your export.'}
              </p>
              <Button type="button" onClick={handleOpenModal}>
                Try again
              </Button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-reauth-title">
          <div className={styles.modal}>
            <h3 id="modal-reauth-title" className={styles.modalTitle}>
              Confirm your password
            </h3>
            <p className={styles.modalText}>
              To protect sensitive health information, please enter your account password to confirm this data export
              request.
            </p>
            <form onSubmit={handleSubmitRequest}>
              <TextField
                label="Account password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
              {modalError && <FormError message={modalError} />}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={requestMutation.isPending}>
                  {requestMutation.isPending ? 'Verifying…' : 'Confirm & request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
