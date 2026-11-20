import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/Button';
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
import { ApiError } from '../../../services/api-client';
import { accountKeys } from '../../../query-keys';
import type { DataExport, DataExportFailure } from '../../../types/models';
import styles from './DataExportSection.module.css';

function formatBytes(bytes: number | null | undefined, unknownSize: string): string {
  if (!bytes) return unknownSize;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function failureText(
  t: ReturnType<typeof useT>,
  failure: DataExportFailure | null | undefined,
): string {
  if (!failure) {
    return t('account.dataExport.fallbackError', 'An error occurred while compiling your export.');
  }
  if (failure.code === 'SECTION_FAILED') {
    return failure.section
      ? t(
          'account.dataExport.sectionFailed',
          'Part of your export ({section}) could not be generated. Request a new export to try again.',
          { section: failure.section },
        )
      : t(
          'account.dataExport.sectionFailedUnknown',
          'Part of your export could not be generated. Request a new export to try again.',
        );
  }
  if (failure.code === 'GENERATION_TIMEOUT') {
    return t(
      'account.dataExport.generationTimeout',
      'Generating your export took too long. Request a new export to try again.',
    );
  }
  return t(
    'account.dataExport.generationFailed',
    'We could not generate your export. Request a new export to try again.',
  );
}

export function DataExportSection() {
  const { timeZone } = useTimeZone();
  const queryClient = useQueryClient();
  // The id is the only handle the API gives us (there is no list endpoint).
  // It lives in memory / the query cache for this session only — never in
  // localStorage, because it is server-derived (hard rule). Re-mounting the
  // page can recover it from the cache; a reload cannot, and the copy below
  // says so honestly.
  const [exportId, setExportId] = useState<string | null>(
    () => queryClient.getQueryData<DataExport>(accountKeys.dataExport())?.id ?? null,
  );
  const { data: exportData, isLoading, error: queryError, refetch } = useDataExport(exportId);
  const requestMutation = useRequestDataExport();
  const { download, isDownloading, downloadError, downloadProblem, resetDownload } = useDownloadExport();
  const t = useT();
  const errorMessage = useErrorMessage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenModal = () => {
    resetDownload();
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    requestMutation.mutate(undefined, {
      onSuccess: (data) => {
        setExportId(data.id);
        setIsModalOpen(false);
      },
      onError: (err) => {
        setModalError(errorMessage(err));
      },
    });
  };

  const downloadErrorMessage = errorMessage(downloadError);
  const status = exportData?.status;
  const exportMissing = queryError instanceof ApiError && queryError.status === 404;

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
          {t('account.dataExport.note24h', 'Note: Ready exports are protected and remain available for download for 24 hours before expiring for security.')}
        </p>
      </div>

      {isLoading && (
        <Skeleton lines={2} label={t('account.dataExport.checkingStatus', 'Checking export status…')} />
      )}

      {exportMissing && (
        <div className={styles.statusCard} role="status">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            {t(
              'account.dataExport.notFound',
              "We couldn't find that export. It may have expired, or it belongs to another session. Request a new export to start again.",
            )}
          </p>
          <div>
            <Button type="button" onClick={handleOpenModal}>
              {t('account.dataExport.requestNew', 'Request a new export')}
            </Button>
          </div>
        </div>
      )}

      {queryError && !exportMissing && (
        <InlineError
          title="Export status couldn't be checked"
          message={errorMessage(queryError) ?? 'Error loading export'}
          onRetry={() => void refetch()}
        />
      )}

      {downloadProblem === 'not_ready' && (
        <div className={styles.statusCard} role="status">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            {t(
              'account.dataExport.notReady',
              "This export isn't ready yet. Its status has been refreshed — try again once it says ready.",
            )}
          </p>
          <div className={styles.modalActions} style={{ marginTop: 0 }}>
            <Button type="button" variant="secondary" onClick={() => void refetch()}>
              {t('account.dataExport.refreshStatus', 'Refresh status')}
            </Button>
            <Button type="button" onClick={handleOpenModal}>
              {t('account.dataExport.requestNew', 'Request a new export')}
            </Button>
          </div>
        </div>
      )}

      {downloadProblem === 'expired' && status !== 'expired' && (
        <div className={styles.statusCard} role="status">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
            {t(
              'account.dataExport.downloadExpired',
              'This export expired before it could be downloaded. Request a new export to get a fresh copy.',
            )}
          </p>
          <div>
            <Button type="button" onClick={handleOpenModal}>
              {t('account.dataExport.requestNew', 'Request a new export')}
            </Button>
          </div>
        </div>
      )}

      {downloadProblem === 'not_found' && (
        <div className={styles.statusCard} role="status">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            {t(
              'account.dataExport.downloadNotFound',
              "That export is no longer available. Request a new export to get a fresh copy.",
            )}
          </p>
          <div>
            <Button type="button" onClick={handleOpenModal}>
              {t('account.dataExport.requestNew', 'Request a new export')}
            </Button>
          </div>
        </div>
      )}

      {downloadProblem === 'other' && downloadErrorMessage && <FormError message={downloadErrorMessage} />}

      {!isLoading && !exportData && !exportMissing && !queryError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <Button type="button" onClick={handleOpenModal}>
              {t('account.dataExport.requestExport', 'Request personal data export')}
            </Button>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {t(
              'account.dataExport.sessionOnly',
              "DocForum doesn't list earlier exports. If you requested one before (or on another device), request again — if it is still being generated, we'll reconnect to the existing export.",
            )}
          </p>
        </div>
      )}

      {exportData && !exportMissing && (
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
              <time dateTime={exportData.createdAt}>
                {formatDateTime(exportData.createdAt, timeZone)}
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
                <span>
                  {t('account.dataExport.fileSize', 'File size:')}{' '}
                  {formatBytes(exportData.sizeBytes, t('account.dataExport.unknownSize', 'Unknown size'))}
                </span>
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
                {exportData.expiresAt
                  ? `${t('account.dataExport.expired', 'This export link expired on')} ${formatDateTime(exportData.expiresAt, timeZone)}.`
                  : t('account.dataExport.expiredUnknown', 'This export has expired.')}{' '}
                {t('account.dataExport.expiredRemoved', 'For privacy and security, temporary files are removed. You can generate a fresh export anytime.')}
              </p>
              <Button type="button" onClick={handleOpenModal}>
                {t('account.dataExport.requestNew', 'Request a new export')}
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                {t('account.dataExport.failed', 'Generation failed:')} {failureText(t, exportData.failure)}
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
        labelledBy="modal-export-title"
        describedBy="modal-export-description"
        overlayClassName={styles.modalOverlay}
        panelClassName={styles.modal}
      >
        <h3 id="modal-export-title" className={styles.modalTitle}>
          {t('account.dataExport.modalTitle', 'Request a data export?')}
        </h3>
        <p id="modal-export-description" className={styles.modalText}>
          {t(
            'account.dataExport.modalDescription',
            "DocForum will compile a machine-readable copy of your records. It can take a few minutes, and this section updates automatically while it is open. The API doesn't list past exports, so after a reload you'll need to request again.",
          )}
        </p>
        <form onSubmit={handleSubmitRequest} noValidate>
          {modalError && <FormError message={modalError} />}
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" loading={requestMutation.isPending}>
              {requestMutation.isPending
                ? t('account.dataExport.requesting', 'Requesting…')
                : t('account.dataExport.confirmRequest', 'Request export')}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
