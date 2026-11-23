import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import type { VerifyOrderResponse } from '../../../types/models';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate, formatDateTime } from '../../../i18n/time-zone';
import { useT } from '../../../i18n/useT';
import styles from './OrderVerify.module.css';
import { paths } from '../../../routes/paths';

interface VerificationResultCardProps {
  result: VerifyOrderResponse;
  onReset: () => void;
}

export function VerificationResultCard({ result, onReset }: VerificationResultCardProps) {
  const t = useT();
  const navigate = useNavigate();
  const { timeZone } = useTimeZone();
  const { status, order, token, verifiedAt, message } = result;

  const getStatusBadge = () => {
    switch (status) {
      case 'valid':
        return <span className={`${styles.statusBadge} ${styles.badgeValid}`}>{t('orderVerify.status.valid', '✓ Valid & Ready')}</span>;
      case 'superseded':
        return <span className={`${styles.statusBadge} ${styles.badgeSuperseded}`}>{t('orderVerify.status.superseded', '⚠ Superseded')}</span>;
      case 'expired':
        return <span className={`${styles.statusBadge} ${styles.badgeExpired}`}>{t('orderVerify.status.expired', '✕ Expired')}</span>;
      case 'fulfilled':
        return <span className={`${styles.statusBadge} ${styles.badgeFulfilled}`}>{t('orderVerify.status.fulfilled', 'ℹ Already Fulfilled')}</span>;
      case 'not_eligible':
        return <span className={`${styles.statusBadge} ${styles.badgeNotEligible}`}>{t('orderVerify.status.notEligible', '✕ Not Eligible')}</span>;
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
      navigate(`${paths.facility.root}?orderId=${encodeURIComponent(order.orderId)}`);
    } else {
      navigate(paths.facility.root);
    }
  };

  return (
    <div className={`${styles.resultCard} ${getResultClass()}`}>
      <div className={styles.resultHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {getStatusBadge()}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {t('orderVerify.result.token', 'Token: {token}', { token })}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {t('orderVerify.result.verifiedOn', 'Verified on {date}', { date: formatDateTime(verifiedAt, timeZone) })}
          </div>
        </div>
      </div>

      <div>
        {status === 'valid' && (
          <p className={styles.resultExplanation}>
            <strong>{t('orderVerify.result.validTitle', 'This order is authentic, current, and eligible for fulfillment.')}</strong>{' '}
            {t('orderVerify.result.validBody', 'You may safely proceed to dispense medication or collect diagnostic samples.')}
          </p>
        )}
        {status === 'superseded' && (
          <div role="alert" className={`${styles.alert} ${styles.alertWarning}`}>
            <strong>{t('orderVerify.result.supersededTitle', 'Order Superseded:')}</strong>{' '}
            {t('orderVerify.result.supersededBody', 'A physician has revised or superseded this order.')}
            {order?.supersededBy && (
              <span>
                {' '}{t('orderVerify.result.supersededBy', 'Superseded by replacement order reference: {reference}.', { reference: order.supersededBy })}
              </span>
            )}
            {' '}<strong>{t('orderVerify.result.doNotDispense', 'Do not dispense or fulfill under this token.')}</strong>
          </div>
        )}
        {status === 'expired' && (
          <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
            <strong>{t('orderVerify.result.expiredTitle', 'Order Expired:')}</strong>{' '}
            {t('orderVerify.result.expiredBody', 'This order reached its expiration cutoff on {date}. Expired orders cannot be fulfilled.', {
              date: order?.expiresAt
                ? formatDate(order.expiresAt, timeZone)
                : t('orderVerify.result.designatedDate', 'its designated date'),
            })}
          </div>
        )}
        {status === 'fulfilled' && (
          <div role="alert" className={`${styles.alert} ${styles.alertInfo}`}>
            <strong>{t('orderVerify.result.fulfilledTitle', 'Order Already Fulfilled:')}</strong>{' '}
            {t('orderVerify.result.fulfilledBody', 'This order was completed')}
            {order?.fulfilledAt
              ? ' ' + t('orderVerify.result.fulfilledOn', 'on {date}', { date: formatDateTime(order.fulfilledAt, timeZone) })
              : ''}
            {order?.fulfilledByFacility
              ? ' ' + t('orderVerify.result.fulfilledBy', 'by {facility}', { facility: order.fulfilledByFacility })
              : ''}
            {t('orderVerify.result.fulfilledTail', '. Duplicate dispensing is prohibited.')}
          </div>
        )}
        {status === 'not_eligible' && (
          <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
            <strong>{t('orderVerify.result.notEligibleTitle', 'Not Eligible:')}</strong>{' '}
            {message || t('orderVerify.result.notEligibleBody', 'This order cannot be fulfilled by this facility or does not match eligibility criteria.')}
          </div>
        )}
      </div>

      {order && (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelPatient', 'Patient')}</span>
              <span className={styles.summaryValue}>{order.patientName}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelOrderType', 'Order Type')}</span>
              <span className={styles.summaryValue} style={{ textTransform: 'capitalize' }}>
                {order.orderType === 'prescription'
                  ? t('orderVerify.result.typePrescription', 'prescription')
                  : t('orderVerify.result.typeLab', 'lab')}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelItem', 'Item / Medication')}</span>
              <span className={styles.summaryValue}>{order.medicationOrTest}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelIssued', 'Issued Date')}</span>
              <span className={styles.summaryValue}>
                {formatDate(order.issuedAt, timeZone)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelExpires', 'Expires Date')}</span>
              <span className={styles.summaryValue}>
                {formatDate(order.expiresAt, timeZone)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{t('orderVerify.result.labelOrderId', 'Order ID')}</span>
              <span className={styles.summaryValue} style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                {order.orderId}
              </span>
            </div>
          </div>

          {order.instructions && (
            <div className={styles.instructionsBox}>
              <h4>{t('orderVerify.result.clinicalInstructions', 'Clinical Instructions')}</h4>
              <p>{order.instructions}</p>
            </div>
          )}
        </>
      )}

      <div className={styles.resultActions}>
        <Button variant="secondary" onClick={onReset}>
          {t('orderVerify.result.verifyAnother', 'Verify another order')}
        </Button>
        {status === 'valid' && (
          <Button variant="primary" onClick={handleProceedToFulfil}>
            {t('orderVerify.result.proceed', 'Proceed to fulfil →')}
          </Button>
        )}
      </div>
    </div>
  );
}
