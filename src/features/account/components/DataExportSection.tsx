import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { Spinner } from '../../../components/Spinner';
import { Dialog } from '../../../components/Dialog';
import { useDataExport, useDownloadExport, useRequestDataExport } from '../hooks/useDataExport';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime } from '../../../i18n/time-zone';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import styles from './DataExportSection.module.css';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DataExportSection() {
  const { timeZone } = useTimeZone();
  const { data: exportData, isLoading, error: queryError, refetch } = useDataExport();
  const requestMutation = useRequestDataExport();
  const { download, isDownloading, downloadError } = useDownloadExport();
  const t = useT();
  const errorMessage = useErrorMessage();

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
        setModalError(errorMessage(err));
      },
    });
  };

  const downloadErrorMessage = errorMessage(downloadError);
  const status = exportData?.status;

  return (
    <section className={styles.section} aria-labelledby="export-heading">
      <div className={styles.header}>
        <div>
          <h2 id="export-heading" className={styles.title}>
                {t('account.dataExport.downloadHeading', 'Download my data')}
              </h2>
          <p className={styles.description}>
            {t('account.dataExport.description', 'Patients have the right to access and download a full, machine-readable copy of their personal health records.')}
          </p>
        </div>
      </div>

      <div className={styles.detailsBox}>
        <strong>{t('account.dataExport.whatIncluded', 'What is included in your export bundle:')}</strong>
        <ul className={styles.detailsList}>
          <li>{t('account.dataExport.profileDetails', 'Profile details and verified contact records')}</li>
          <li>{t('account.dataExport.appointmentHistory', 'Appointment history, consultation clinical summaries, and outcomes')}</li>
          <li>{t('account.dataExport.referrals', 'Issued specialist referrals and fulfillment statuses')}</li>
          <li>{t('account.dataExport.prescriptions', 'Prescriptions, laboratory test diagnostic orders, and attached results')}</li>
          <li>{t('account.dataExport.paymentLogs', 'Cryptographic payment intent receipts and escrow settlement logs')}</li>
        </ul>
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {t('account.dataExport.note24h', 'Note: Ready exports are protected and remain available for download for <strong>24 hours</strong> before expiring for security.')}
        </p>
      </div>

      {isLoading && (
        <Skeleton lines={2} label={t('account.dataExport.checkingStatus', 'Checking export status…')} />
      )}

      {queryError && (
        <InlineError
          title="Export status couldn't be checked"
          message={errorMessage(queryError) ?? 'Error loading export'}
          onRetry={() => void refetch()}
        />
      )}
      {downloadErrorMessage && <FormError message={downloadErrorMessage} />}

      {!isLoading && !exportData && (
        <div>
          <Button type="button" onClick={handleOpenModal}>
                {t('account.dataExport.requestExport', 'Request personal data export')}
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
                ? t('account.dataExport.statusProcessing', 'Processing export')
                : status === 'ready'
                  ? t('account.dataExport.statusReady', 'Ready for download')
                  : status === 'expired'
                    ? t('account.dataExport.statusExpired', 'Export expired')
                    : t('account.dataExport.statusFailed', 'Export failed')}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Requested:{' '}
              <time dateTime={exportData.requestedAt}>
                {formatDateTime(exportData.requestedAt, timeZone)}
              </time>
            </span>
          </div>

          {(status === 'pending' || status === 'processing') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Spinner size={18} />
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {t('account.dataExport.generating', 'Your export bundle is being generated by docforum-core. This page updates automatically when ready.')}
              </p>
            </div>
          )}

          {status === 'ready' && (
            <div>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)' }}>
                {t('account.dataExport.ready', 'Your data export is ready. Download it before it expires on')}{' '}
                <strong>
                  {exportData.expiresAt
                    ? formatDateTime(exportData.expiresAt, timeZone)
                    : t('account.dataExport.unknownExpiry', 'an unknown date')}
                </strong>
                .
              </p>
              <div className={styles.metaInfo} style={{ marginBottom: 'var(--space-3)' }}>
                <span>{t('account.dataExport.fileSize', 'File size:')} {formatBytes(exportData.fileSizeBytes)}</span>
                <span>{t('account.dataExport.format', 'Format:')} JSON bundle (FHIR-compatible)</span>
              </div>
              <Button
                type="button"
                onClick={() => download(exportData.id, `docforum-export-${exportData.id}.json`)}
                loading={isDownloading}
              >
                {isDownloading ? t('account.dataExport.downloading', 'Downloading…') : t('account.dataExport.download', 'Download export file')}
              </Button>
            </div>
          )}

          {status === 'expired' && (
            <div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                {t('account.dataExport.expired', 'This export link expired on')}{' '}
                {formatDateTime(exportData.expiresAt, timeZone)}. For privacy and security, temporary
                files are removed. You can generate a fresh export anytime.
              </p>
              <Button type="button" onClick={handleOpenModal}>
                Request new export
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                {t('account.dataExport.failed', 'Generation failed:')} {exportData.errorMessage ?? t('account.dataExport.fallbackError', 'An error occurred while compiling your export.')}
              </p>
              <Button type="button" onClick={handleOpenModal}>
                {t('common.tryAgain', 'Try again')}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        labelledBy="modal-reauth-title"
        describedBy="modal-reauth-description"
        overlayClassName={styles.modalOverlay}
        panelClassName={styles.modal}
      >
        <h3 id="modal-reauth-title" className={styles.modalTitle}>
          {t('account.dataExport.modalTitle', 'Confirm your password')}
        </h3>
        <p id="modal-reauth-description" className={styles.modalText}>
          {t('account.dataExport.modalDescription', 'To protect sensitive health information, please enter your account password to confirm this data export request.')}
        </p>
        <form onSubmit={handleSubmitRequest} noValidate>
          <TextField
            label={t('account.dataExport.passwordLabel', 'Account password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={modalError ?? undefined}
            required
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" loading={requestMutation.isPending}>
              {requestMutation.isPending
                ? t('account.dataExport.verifying', 'Verifying…')
                : t('account.dataExport.confirmRequest', 'Confirm & request')}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
