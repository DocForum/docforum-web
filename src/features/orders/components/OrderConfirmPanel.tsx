import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useConfirmReceipt, useReportProblem } from '../hooks/useOrder';
import type { DisputeReason, OrderConfirmationWindow } from '../../../types/models';
import styles from './OrderConfirmPanel.module.css';

interface OrderConfirmPanelProps {
  orderId: string;
  updatedAt: string;
  confirmationWindow: OrderConfirmationWindow;
}

const REASON_OPTIONS: { value: DisputeReason; label: string }[] = [
  { value: 'not_received', label: 'I did not receive this order' },
  { value: 'wrong_item', label: 'Wrong item was dispensed' },
  { value: 'incomplete', label: 'Order was incomplete' },
  { value: 'damaged', label: 'Item was damaged' },
  { value: 'other', label: 'Other problem' },
];

function formatDeadline(deadlineAt: string): string {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    return 'The confirmation window has closed.';
  }

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
  }

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
  }

  return 'Less than 1 hour remaining';
}

function inactionDescription(consequence: OrderConfirmationWindow['inactionConsequence']): string {
  switch (consequence) {
    case 'auto_confirm':
      return 'If you take no action, this order will be automatically confirmed as received.';
    case 'escrow_held':
      return 'If you take no action, the payment will remain held in escrow pending review.';
    case 'refund_pending':
      return 'If you take no action, a refund process will be initiated.';
    default:
      return 'Please confirm or report a problem within the time window.';
  }
}

export function OrderConfirmPanel({
  orderId,
  updatedAt,
  confirmationWindow,
}: OrderConfirmPanelProps) {
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
    } catch (err) {
      setError('Failed to confirm receipt. Please try again.');
    }
  }

  async function handleReport() {
    setError(null);
    if (!reportReason) {
      setError('Please select a reason for the problem.');
      return;
    }
    if (reportDescription.trim().length < 10) {
      setError('Please provide more details (at least 10 characters).');
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
    } catch (err) {
      setError('Failed to report problem. Please try again.');
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
        <h3 className={styles.heading}>Confirmation window closed</h3>
        <p className={styles.text}>
          The time to confirm or report a problem has passed.{' '}
          {inactionDescription(confirmationWindow.inactionConsequence)}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.panel} data-testid="confirm-panel">
        <h3 className={styles.heading}>Confirm receipt or report a problem</h3>
        <p className={styles.text}>
          Please confirm that you received this order correctly, or report a problem within the time window.
        </p>

        <div className={styles.deadlineBanner} data-testid="deadline-banner">
          <strong>{formatDeadline(confirmationWindow.deadlineAt)}</strong>
          <span className={styles.deadlineNote}>
            {inactionDescription(confirmationWindow.inactionConsequence)}
          </span>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className={styles.confirmButton}
          >
            {confirmMutation.isPending ? <Spinner size={16} /> : 'Confirm receipt'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowReportDialog(true)}
            disabled={reportMutation.isPending}
            className={styles.reportButton}
          >
            Report a problem
          </Button>
        </div>

        {error && <FormError message={error} />}
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
              Report a problem
            </h2>
            <p className={styles.dialogText}>
              Please describe the problem with this order. This will open a dispute review.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="report-reason" className={styles.label}>
                Reason *
              </label>
              <select
                id="report-reason"
                className={styles.select}
                value={reportReason ?? ''}
                onChange={(e) => setReportReason(e.target.value as DisputeReason)}
                disabled={reportMutation.isPending}
              >
                <option value="">Select a reason</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="report-description" className={styles.label}>
                Details *
              </label>
              <textarea
                id="report-description"
                className={styles.textarea}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                disabled={reportMutation.isPending}
                placeholder="Please describe what went wrong..."
                rows={4}
                minLength={10}
                maxLength={500}
              />
              <p className={styles.charCount}>
                {reportDescription.length} / 500 characters
              </p>
            </div>

            {error && <FormError message={error} />}

            <div className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={closeReportDialog}
                disabled={reportMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReport}
                disabled={reportMutation.isPending || !reportReason}
              >
                {reportMutation.isPending ? <Spinner size={16} /> : 'Submit report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
