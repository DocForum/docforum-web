import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import type { Translate } from '../../../i18n/useT';
import { statusLabel, orderTypeLabel } from '../../payments/status';
import { formatStroops } from '../../../services/payments-service';
import { useDispute } from '../hooks/useDisputes';
import { describeDisputeDetailError } from '../errors';
import { ageTone, hoursSince, reasonLabel } from '../queue';
import { ageLabel, formatDateTime } from '../format';
import { resolutionConsequence, resolutionLabel } from '../resolution';
import { AttachmentList } from './AttachmentList';
import { ResolutionDialog } from './ResolutionDialog';
import type { DisputeResolution, DisputeTimelineEvent, FulfillmentDispute } from '../../../types/models';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
} as const;

function actorRoleLabel(event: DisputeTimelineEvent, t: Translate): string {
  switch (event.actorRole) {
    case 'system':
      return t('admin.disputes.role.system', 'System');
    case 'patient':
      return t('admin.disputes.role.patient', 'Patient');
    case 'doctor':
      return t('admin.disputes.role.doctor', 'Doctor');
    case 'facility':
      return t('admin.disputes.role.facility', 'Facility');
    case 'admin':
      return t('admin.disputes.role.admin', 'Admin');
    default:
      return ((event.actorRole as string).charAt(0).toUpperCase() +
        (event.actorRole as string).slice(1));
  }
}

function Timeline({ events }: { events: DisputeTimelineEvent[] }) {
  const t = useT();
  if (events.length === 0) {
    return (
      <p className={styles.muted}>
        {t('admin.disputes.detail.noTimeline', 'No timeline events recorded.')}
      </p>
    );
  }
  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li className={styles.timelineItem} data-kind={event.kind} key={event.id}>
          <span className={styles.timelineTime}>
            <time dateTime={event.at}>{formatDateTime(event.at)}</time> ·{' '}
            {actorRoleLabel(event, t)} · {event.actorName}
          </span>
          <p className={styles.timelineSummary}>{event.summary}</p>
        </li>
      ))}
    </ol>
  );
}

/** What actually happened to the money, read from the post-resolution payment
 * status rather than assuming the release/refund succeeded. */
function resolvedPaymentCopy(
  dispute: FulfillmentDispute,
  resolution: DisputeResolution,
  t: Translate,
): string {
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  if (resolution === 'facility') {
    return dispute.payment.status === 'released'
      ? t(
          'admin.disputes.detail.releasedToFacility',
          '{amount} was released from escrow to {facility}.',
          { amount, facility: dispute.facility.name },
        )
      : t(
          'admin.disputes.detail.decidedFacilityPending',
          'The dispute was decided for the facility; the payment is currently "{status}".',
          { status: statusLabel(dispute.payment.status, t) },
        );
  }
  return dispute.payment.status === 'refunded'
    ? t(
        'admin.disputes.detail.refundedToPatient',
        '{amount} was refunded from escrow to {patient}.',
        { amount, patient: dispute.patientName },
      )
    : t(
        'admin.disputes.detail.decidedPatientPending',
        'The dispute was decided for the patient; the payment is currently "{status}".',
        { status: statusLabel(dispute.payment.status, t) },
      );
}

function ResolvedNotice({ dispute }: { dispute: FulfillmentDispute }) {
  const t = useT();
  if (!dispute.resolution) return null;
  const party = resolutionLabel(dispute.resolution, t);
  const resolvedBy = dispute.resolvedBy
    ? t('admin.disputes.detail.resolvedBy', 'Resolved by {name}', { name: dispute.resolvedBy })
    : t('admin.disputes.detail.resolved', 'Resolved');
  return (
    <section className={styles.resolved} aria-labelledby="dispute-resolved-heading">
      <h2 id="dispute-resolved-heading">
        {t('admin.disputes.detail.resolvedFor', 'Resolved for the {party}', { party })}
      </h2>
      <p>{resolvedPaymentCopy(dispute, dispute.resolution, t)}</p>
      <p className={styles.muted}>
        {resolvedBy}
        {dispute.resolvedAt
          ? t('admin.disputes.detail.resolvedOn', ' on {date}. This decision is final.', {
              date: formatDateTime(dispute.resolvedAt),
            })
          : t('admin.disputes.detail.resolvedFinal', '. This decision is final.')}
      </p>
      {dispute.resolutionNotes && (
        <p>
          <strong>{t('admin.disputes.detail.resolutionNotes', 'Resolution notes:')}</strong>{' '}
          {dispute.resolutionNotes}
        </p>
      )}
    </section>
  );
}

function ActionChoice({
  dispute,
  resolution,
  onChoose,
}: {
  dispute: FulfillmentDispute;
  resolution: DisputeResolution;
  onChoose: () => void;
}) {
  const t = useT();
  const consequence = resolutionConsequence(dispute, resolution, t);
  return (
    <div className={styles.panelBlock}>
      <Button variant={resolution === 'patient' ? 'danger' : 'primary'} onClick={onChoose}>
        {t('admin.disputes.detail.resolveFor', 'Resolve for {party}', {
          party: resolutionLabel(resolution, t),
        })}
      </Button>
      <p className={styles.muted}>{consequence.payment}</p>
      <p className={styles.muted}>{consequence.outcome}</p>
    </div>
  );
}

export function DisputeDetail({ disputeId }: { disputeId: string }) {
  const t = useT();
  const query = useDispute(disputeId);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <p className={styles.status}>
        <Spinner />
        {t('admin.disputes.detail.loading', 'Loading dispute…')}
      </p>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className={styles.detail}>
        <Link to="/admin/disputes" className={styles.backLink}>
          {t('admin.disputes.detail.back', '← All disputes')}
        </Link>
        <div className={styles.errorBox} role="alert">
          <p>{describeDisputeDetailError(query.error, t)}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {t('errors.actions.tryAgain', 'Try again')}
          </Button>
        </div>
      </div>
    );
  }

  const dispute = query.data;
  if (!dispute) {
    return (
      <div className={styles.detail}>
        <Link to="/admin/disputes" className={styles.backLink}>
          {t('admin.disputes.detail.back', '← All disputes')}
        </Link>
        <p className={styles.empty}>
          {t('admin.disputes.detail.gone', 'This dispute no longer exists.')}
        </p>
      </div>
    );
  }

  const now = Date.now();
  const hours = hoursSince(dispute.openedAt, now);
  const isOpen = dispute.status === 'open';
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  const facilityConsequence = resolutionConsequence(dispute, 'facility', t);
  const patientConsequence = resolutionConsequence(dispute, 'patient', t);

  return (
    <div className={styles.detail}>
      <Link to="/admin/disputes" className={styles.backLink}>
        {t('admin.disputes.detail.back', '← All disputes')}
      </Link>

      {notice && (
        <div className={styles.noticeSuccess} role="status">
          <p>{notice}</p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setNotice(null)}
            aria-label={t('admin.disputes.dismiss', 'Dismiss')}
          >
            ×
          </button>
        </div>
      )}
      {staleNotice && (
        <div className={styles.noticeWarning} role="alert">
          <p>{staleNotice}</p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setStaleNotice(null)}
            aria-label={t('admin.disputes.dismiss', 'Dismiss')}
          >
            ×
          </button>
        </div>
      )}

      <header className={styles.detailHeader}>
        <div className={styles.badges}>
          <span className={isOpen ? styles.statusOpen : styles.statusResolved}>
            {isOpen
              ? t('admin.disputes.detail.open', 'Open')
              : t('admin.disputes.detail.resolvedFor', 'Resolved for the {party}', {
                  party: resolutionLabel(dispute.resolution ?? 'patient', t),
                })}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason, t)}</span>
          {isOpen && (
            <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
              {t('admin.disputes.openFor', 'Open {age}', {
                age: ageLabel(dispute.openedAt, now, t),
              })}
            </span>
          )}
        </div>
        <h1 className={styles.detailTitle}>{dispute.itemName}</h1>
        <p className={styles.detailMeta}>
          {t('admin.disputes.detail.orderLabel', '{orderType} order', {
            orderType: orderTypeLabel(dispute.orderType, t),
          })}{' '}
          <code>{dispute.orderId}</code> · {dispute.facility.name}
          {t('admin.disputes.detail.metaOpened', ' · opened {date}', {
            date: formatDateTime(dispute.openedAt),
          })}
        </p>
      </header>

      {dispute.status === 'open' ? (
        <div className={styles.noticeWarning} role="status">
          <p>
            <strong>
              {t('admin.disputes.detail.paymentBlockedStrong', 'Payment release is blocked.')}
            </strong>{' '}
            {t(
              'admin.disputes.detail.paymentBlockedBody',
              '{amount} is held in escrow until this dispute is resolved.',
              { amount },
            )}
          </p>
        </div>
      ) : (
        <ResolvedNotice dispute={dispute} />
      )}

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="dispute-payment-heading">
          <h2 className={styles.panelTitle} id="dispute-payment-heading">
            {t('admin.disputes.detail.payment', 'Payment')}
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>{t('admin.disputes.detail.blockedAmount', 'Blocked amount')}</dt>
              <dd className={styles.amount}>{amount}</dd>
            </div>
            <div>
              <dt>{t('admin.disputes.detail.escrowStatus', 'Escrow status')}</dt>
              <dd>{statusLabel(dispute.payment.status, t)}</dd>
            </div>
            <div>
              <dt>{t('admin.disputes.detail.paymentIntent', 'Payment intent')}</dt>
              <dd>
                <Link className={styles.mono} to={`/admin?intent=${encodeURIComponent(dispute.payment.intentId)}`}>
                  {dispute.payment.intentId}
                </Link>
              </dd>
            </div>
            {dispute.payment.escrowId && (
              <div>
                <dt>{t('admin.disputes.detail.escrowId', 'Escrow id')}</dt>
                <dd className={styles.mono}>{dispute.payment.escrowId}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-report-heading">
          <h2 className={styles.panelTitle} id="dispute-report-heading">
            {t('admin.disputes.detail.patientReport', 'Patient report')}
          </h2>
          <p className={styles.fieldHint}>
            {t('admin.disputes.detail.reportMeta', '{reason} · submitted {date} by {name}', {
              reason: reasonLabel(dispute.patientReport.reason, t),
              date: formatDateTime(dispute.patientReport.submittedAt),
              name: dispute.patientReport.submittedBy,
            })}
          </p>
          <p className={styles.reportText}>{dispute.patientReport.description}</p>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-proof-heading">
          <h2 className={styles.panelTitle} id="dispute-proof-heading">
            {t('admin.disputes.detail.facilityProof', 'Facility proof')}
          </h2>
          {dispute.facilityProof ? (
            <>
              <p>
                <span className={styles.panelLabel}>
                  {t('admin.disputes.detail.reference', 'Reference')}
                </span>{' '}
                <span className={styles.proofReference}>{dispute.facilityProof.reference}</span>
              </p>
              <p className={styles.fieldHint}>
                {t('admin.disputes.detail.proofMeta', 'Submitted {date} by {name}', {
                  date: formatDateTime(dispute.facilityProof.submittedAt),
                  name: dispute.facilityProof.submittedBy,
                })}
              </p>
              {dispute.facilityProof.note ? (
                <p>{dispute.facilityProof.note}</p>
              ) : (
                <p className={styles.muted}>
                  {t('admin.disputes.detail.noNote', 'No note was added.')}
                </p>
              )}
              <div className={styles.panelBlock}>
                <h3 className={styles.panelLabel}>
                  {t('admin.disputes.detail.attachments', 'Attachments')}
                </h3>
                <AttachmentList disputeId={dispute.id} attachments={dispute.facilityProof.attachments} />
              </div>
            </>
          ) : (
            <p className={styles.danger}>
              {t(
                'admin.disputes.detail.noProof',
                "The facility has not submitted proof yet. Without proof, resolving for the facility means releasing money on the patient's word alone.",
              )}
            </p>
          )}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="dispute-timeline-heading">
        <h2 className={styles.panelTitle} id="dispute-timeline-heading">
          {t('admin.disputes.detail.timeline', 'Timeline')}
        </h2>
        <Timeline events={dispute.timeline} />
      </section>

      {isOpen && (
        <section className={styles.panel} aria-labelledby="dispute-resolve-heading">
          <h2 className={styles.panelTitle} id="dispute-resolve-heading">
            {t('admin.disputes.detail.resolveHeading', 'Resolve this dispute')}
          </h2>
          <p className={styles.finalWarning}>
            {t(
              'admin.disputes.detail.finalWarning',
              'Both choices are final. Resolving releases or refunds the escrow — it cannot be reversed or re-opened.',
            )}
          </p>
          <div className={styles.resolveActions}>
            <ActionChoice dispute={dispute} resolution="facility" onChoose={() => setResolution('facility')} />
            <ActionChoice dispute={dispute} resolution="patient" onChoose={() => setResolution('patient')} />
          </div>
          {(facilityConsequence.movesMoney || patientConsequence.movesMoney) && (
            <p className={styles.fieldHint}>
              {t(
                'admin.disputes.detail.consequenceHint',
                'The exact payment consequence is shown again in the confirmation step before anything moves.',
              )}
            </p>
          )}
        </section>
      )}

      {resolution && (
        <ResolutionDialog
          dispute={dispute}
          resolution={resolution}
          onClose={() => {
            setResolution(null);
            void query.refetch();
          }}
          onResolved={(updated) => {
            setResolution(null);
            setNotice(
              t(
                'admin.disputes.detail.resolvedNotice',
                'Dispute resolved for the {party}. The decision is final and was written to the audit trail.',
                { party: resolutionLabel(updated.resolution ?? resolution, t) },
              ),
            );
          }}
          onStale={(message) => {
            // The mutation hook already invalidates a conflicted detail (and
            // the open queue); refetching here would fetch the same page twice.
            setResolution(null);
            setStaleNotice(message);
          }}
        />
      )}
    </div>
  );
}
