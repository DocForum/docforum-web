import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useConfirmReceipt, useReportProblem } from '../hooks/useOrder';
import type { DisputeReason, OrderConfirmationWindow } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './OrderConfirmPanel.module.css';

interface OrderConfirmPanelProps {
  orderId: string;
  updatedAt: string;
  confirmationWindow: OrderConfirmationWindow;
}

const REASON_OPTIONS: DisputeReason[] = [
  'not_received',
  'wrong_item',
  'incomplete',
  'damaged',
  'other',
];

function formatDeadline(deadlineAt: string, t: ReturnType<typeof useT>): string {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hourMs = 1000 * 60 * 60;

  if (diffMs < 0) {
    return t('orders.confirm.deadline.closed', 'The confirmation window has closed.');
  }
  if (diffMs < hourMs) {
    return t('orders.confirm.deadline.lessThanHour', 'Less than 1 hour remaining');
  }

  // Round to the nearest hour so "24 hours from now" (minus render time)
  // reads as 1 day, not 23 hours.
  const diffHours = Math.round(diffMs / hourMs);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) {
    return t(
      'orders.confirm.deadline.days',
      '{count, plural, one {# day remaining} other {# days remaining}}',
      { count: diffDays },
    );
  }
  return t(
    'orders.confirm.deadline.hours',
    '{count, plural, one {# hour remaining} other {# hours remaining}}',
    { count: diffHours },
  );
}

function inactionDescription(
  consequence: OrderConfirmationWindow['inactionConsequence'],
  t: ReturnType<typeof useT>,
): string {
  switch (consequence) {
    case 'auto_confirm':
      return t('orders.confirm.inaction.autoConfirm', 'If you take no action, this order will be automatically confirmed as received.');
    case 'escrow_held':
      return t('orders.confirm.inaction.escrowHeld', 'If you take no action, the payment will remain held in escrow pending review.');
    case 'refund_pending':
      return t('orders.confirm.inaction.refundPending', 'If you take no action, a refund process will be initiated.');
    default:
      return t('orders.confirm.inaction.default', 'Please confirm or report a problem within the time window.');
  }
}

function reasonLabel(reason: DisputeReason, t: ReturnType<typeof useT>): string {
  switch (reason) {
    case 'not_received':
      return t('orders.confirm.reason.notReceived', 'I did not receive this order');
    case 'wrong_item':
      return t('orders.confirm.reason.wrongItem', 'Wrong item was dispensed');
    case 'incomplete':
      return t('orders.confirm.reason.incomplete', 'Order was incomplete');
    case 'damaged':
      return t('orders.confirm.reason.damaged', 'Item was damaged');
    case 'other':
      return t('orders.confirm.reason.other', 'Other problem');
  }
}

export function OrderConfirmPanel({
  orderId,
  updatedAt,
  confirmationWindow,
}: OrderConfirmPanelProps) {
  const t = useT();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<DisputeReason | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirmMutation = useConfirmReceipt();
  const reportMutation = useReportProblem();

  const isExpired = new Date(confirmationWindow.deadlineAt) < new Date();

  async function handleConfirm() {
    setError(null);
    try {
      await confirmMutation.mutateAsync({
        orderId,
        expectedUpdatedAt: updatedAt,
      });
    } catch {
      setError(t('orders.confirm.error.confirm', 'Failed to confirm receipt. Please try again.'));
    }
  }

  async function handleReport() {
    setError(null);
    if (!reportReason) {
      setError(t('orders.confirm.error.reasonRequired', 'Please select a reason for the problem.'));
      return;
    }
    if (reportDescription.trim().length < 10) {
      setError(t('orders.confirm.error.detailsRequired', 'Please provide more details (at least 10 characters).'));
      return;
    }
    try {
      await reportMutation.mutateAsync({
        orderId,
        reason: reportReason,
        description: reportDescription.trim(),
        expectedUpdatedAt: updatedAt,
      });
      setShowReportDialog(false);
      setReportReason(null);
      setReportDescription('');
    } catch {
      setError(t('orders.confirm.error.report', 'Failed to report problem. Please try again.'));
    }
  }

  function closeReportDialog() {
    setShowReportDialog(false);
    setReportReason(null);
    setReportDescription('');
    setError(null);
  }

  if (isExpired) {
    return (
      <section className={styles.panel} data-testid="confirm-panel-expired">
        <h3 className={styles.heading}>{t('orders.confirm.closedTitle', 'Confirmation window closed')}</h3>
        <p className={styles.text}>
          {t('orders.confirm.closedBody', 'The time to confirm or report a problem has passed.')} {' '}
          {inactionDescription(confirmationWindow.inactionConsequence, t)}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.panel} data-testid="confirm-panel">
        <h3 className={styles.heading}>{t('orders.confirm.title', 'Confirm receipt or report a problem')}</h3>
        <p className={styles.text}>
          {t('orders.confirm.intro', 'Please confirm that you received this order correctly, or report a problem within the time window.')}
        </p>

        <div className={styles.deadlineBanner} data-testid="deadline-banner">
          <strong>{formatDeadline(confirmationWindow.deadlineAt, t)}</strong>
          <span className={styles.deadlineNote}>
            {inactionDescription(confirmationWindow.inactionConsequence, t)}
          </span>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className={styles.confirmButton}
          >
            {confirmMutation.isPending ? <Spinner size={16} /> : t('orders.confirm.confirm', 'Confirm receipt')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowReportDialog(true)}
            disabled={reportMutation.isPending}
            className={styles.reportButton}
          >
            {t('orders.confirm.report', 'Report a problem')}
          </Button>
        </div>

        {error && !showReportDialog && <FormError message={error} />}
      </section>

      {showReportDialog && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          data-testid="report-dialog"
        >
          <div className={styles.dialog}>
            <h2 id="report-dialog-title" className={styles.dialogTitle}>
              {t('orders.confirm.report', 'Report a problem')}
            </h2>
            <p className={styles.dialogText}>
              {t('orders.confirm.dialogIntro', 'Please describe the problem with this order. This will open a dispute review.')}
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="report-reason" className={styles.label}>
                {t('orders.confirm.reason', 'Reason')} *
              </label>
              <select
                id="report-reason"
                className={styles.select}
                value={reportReason ?? ''}
                onChange={(e) => setReportReason(e.target.value as DisputeReason)}
                disabled={reportMutation.isPending}
              >
                <option value="">{t('orders.confirm.selectReason', 'Select a reason')}</option>
                {REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reasonLabel(reason, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="report-description" className={styles.label}>
                {t('orders.confirm.details', 'Details')} *
              </label>
              <textarea
                id="report-description"
                className={styles.textarea}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                disabled={reportMutation.isPending}
                placeholder={t('orders.confirm.detailsPlaceholder', 'Please describe what went wrong...')}
                rows={4}
                minLength={10}
                maxLength={500}
              />
              <p className={styles.charCount}>
                {t('orders.confirm.characterCount', '{count} / 500 characters', { count: reportDescription.length })}
              </p>
            </div>

            {error && <FormError message={error} />}

            <div className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={closeReportDialog}
                disabled={reportMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleReport}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? <Spinner size={16} /> : t('orders.confirm.submitReport', 'Submit report')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
