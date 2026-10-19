import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import type { VerifyOrderResponse } from '../../../types/models';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate, formatDateTime } from '../../../i18n/time-zone';
import styles from './OrderVerify.module.css';

interface VerificationResultCardProps {
  result: VerifyOrderResponse;
  onReset: () => void;
}

export function VerificationResultCard({ result, onReset }: VerificationResultCardProps) {
  const navigate = useNavigate();
  const { timeZone } = useTimeZone();
  const { status, order, token, verifiedAt, message } = result;

  const getStatusBadge = () => {
    switch (status) {
      case 'valid':
        return <span className={`${styles.statusBadge} ${styles.badgeValid}`}>✓ Valid &amp; Ready</span>;
      case 'superseded':
        return <span className={`${styles.statusBadge} ${styles.badgeSuperseded}`}>⚠ Superseded</span>;
      case 'expired':
        return <span className={`${styles.statusBadge} ${styles.badgeExpired}`}>✕ Expired</span>;
      case 'fulfilled':
        return <span className={`${styles.statusBadge} ${styles.badgeFulfilled}`}>ℹ Already Fulfilled</span>;
      case 'not_eligible':
        return <span className={`${styles.statusBadge} ${styles.badgeNotEligible}`}>✕ Not Eligible</span>;
    }
  };

  const getResultClass = () => {
    switch (status) {
      case 'valid':
        return styles.resultValid;
      case 'superseded':
        return styles.resultSuperseded;
      case 'expired':
        return styles.resultExpired;
      case 'fulfilled':
        return styles.resultFulfilled;
      case 'not_eligible':
        return styles.resultNotEligible;
    }
  };

  const handleProceedToFulfil = () => {
    if (order?.orderId) {
      navigate(`/facility?orderId=${encodeURIComponent(order.orderId)}`);
    } else {
      navigate('/facility');
    }
  };

  return (
    <div className={`${styles.resultCard} ${getResultClass()}`}>
      <div className={styles.resultHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {getStatusBadge()}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              Token: {token}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            Verified on {formatDateTime(verifiedAt, timeZone)}
          </div>
        </div>
      </div>

      <div>
        {status === 'valid' && (
          <p className={styles.resultExplanation}>
            <strong>This order is authentic, current, and eligible for fulfillment.</strong> You may safely proceed to
            dispense medication or collect diagnostic samples.
          </p>
        )}
        {status === 'superseded' && (
          <div role="alert" className={`${styles.alert} ${styles.alertWarning}`}>
            <strong>Order Superseded:</strong> A physician has revised or superseded this order.
            {order?.supersededBy && (
              <span> Superseded by replacement order reference: <code>{order.supersededBy}</code>.</span>
            )}
            {' '}<strong>Do not dispense or fulfill under this token.</strong>
          </div>
        )}
        {status === 'expired' && (
          <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
            <strong>Order Expired:</strong> This order reached its expiration cutoff on{' '}
            {order?.expiresAt ? formatDate(order.expiresAt, timeZone) : 'its designated date'}. Expired orders cannot be fulfilled.
          </div>
        )}
        {status === 'fulfilled' && (
          <div role="alert" className={`${styles.alert} ${styles.alertInfo}`}>
            <strong>Order Already Fulfilled:</strong> This order was completed
            {order?.fulfilledAt ? ` on ${formatDateTime(order.fulfilledAt, timeZone)}` : ''}
            {order?.fulfilledByFacility ? ` by ${order.fulfilledByFacility}` : ''}. Duplicate dispensing is prohibited.
          </div>
        )}
        {status === 'not_eligible' && (
          <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
            <strong>Not Eligible:</strong> {message || 'This order cannot be fulfilled by this facility or does not match eligibility criteria.'}
          </div>
        )}
      </div>

      {order && (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Patient</span>
              <span className={styles.summaryValue}>{order.patientName}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Order Type</span>
              <span className={styles.summaryValue} style={{ textTransform: 'capitalize' }}>
                {order.orderType}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Item / Medication</span>
              <span className={styles.summaryValue}>{order.medicationOrTest}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Issued Date</span>
              <span className={styles.summaryValue}>
                {formatDate(order.issuedAt, timeZone)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Expires Date</span>
              <span className={styles.summaryValue}>
                {formatDate(order.expiresAt, timeZone)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Order ID</span>
              <span className={styles.summaryValue} style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                {order.orderId}
              </span>
            </div>
          </div>

          {order.instructions && (
            <div className={styles.instructionsBox}>
              <h4>Clinical Instructions</h4>
              <p>{order.instructions}</p>
            </div>
          )}
        </>
      )}

      <div className={styles.resultActions}>
        <Button variant="secondary" onClick={onReset}>
          Verify another order
        </Button>
        {status === 'valid' && (
          <Button variant="primary" onClick={handleProceedToFulfil}>
            Proceed to fulfil →
          </Button>
        )}
      </div>
    </div>
  );
}
