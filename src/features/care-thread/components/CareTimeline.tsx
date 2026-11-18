import { Link } from 'react-router-dom';
import { useFormat } from '../../../i18n/useFormat';
import type { CareStepStatus, CareStepType, CareThread, CareThreadStep } from '../../../types/models';
import { EmptyState, type EmptyStateAction } from '../../../components/states/EmptyState';
import { Skeleton } from '../../../components/states/Skeleton';
import { DualZoneTime } from '../../../i18n/components/ZonedTime';
import styles from './CareTimeline.module.css';

interface CareTimelineProps {
  thread?: CareThread | null;
  isLoading?: boolean;
  /** Next step offered when there is no thread yet (#106: an empty state
   *  always suggests one). Defaults to the patient care hub. */
  emptyAction?: EmptyStateAction;
}

function getStepIcon(_type: CareStepType, status: CareStepStatus, index: number): string {
  if (status === 'completed') return '✓';
  if (status === 'action_required') return '!';
  return String(index + 1);
}

function getStatusBadgeClass(status: CareStepStatus): string {
  switch (status) {
    case 'completed':
      return styles.badgeCompleted;
    case 'action_required':
      return styles.badgeAction;
    case 'in_progress':
      return styles.badgeProgress;
    default:
      return styles.badgePending;
  }
}

function getItemClass(status: CareStepStatus): string {
  switch (status) {
    case 'completed':
      return styles.completed;
    case 'action_required':
      return styles.actionRequired;
    case 'in_progress':
      return styles.inProgress;
    default:
      return styles.pending;
  }
}

function formatStatus(status: CareStepStatus): string {
  switch (status) {
    case 'action_required':
      return 'Action required';
    case 'in_progress':
      return 'In progress';
    default:
      return status;
  }
}

export function CareTimeline({
  thread,
  isLoading = false,
  emptyAction = { label: 'Go to your care hub', to: '/care' },
}: CareTimelineProps) {
  const { formatDate } = useFormat();
  if (isLoading) {
    return (
      <div className={styles.timelineContainer}>
        <Skeleton lines={5} height="1.25rem" label="Loading care journey timeline" />
      </div>
    );
  }

  if (!thread || !thread.steps || thread.steps.length === 0) {
    return (
      <div className={styles.timelineContainer}>
        <EmptyState
          title="No care thread found"
          description="There are no recorded care milestones for this thread yet. Once a consultation is booked or a referral is received, the continuous care journey appears here."
          action={emptyAction}
        />
      </div>
    );
  }

  // Check if thread stopped at consultation without subsequent referral or order steps
  const hasConsultation = thread.steps.some((s) => s.stepType === 'consultation');
  const hasSubsequentSteps = thread.steps.some(
    (s) => s.stepType === 'referral' || s.stepType === 'order' || s.stepType === 'fulfillment' || s.stepType === 'payment',
  );
  const isPartialConcludedAtConsultation = hasConsultation && !hasSubsequentSteps;

  return (
    <section className={styles.timelineContainer} aria-label="Care thread timeline">
      <div className={styles.timelineHeader}>
        <div>
          <span className={styles.statusPill}>{thread.status} care episode</span>
          <h2 className={styles.threadTitle}>{thread.title}</h2>
          <div className={styles.threadMeta}>
            <span>Doctor: {thread.doctorName} ({thread.specialty})</span>
            <span>
              Started: <time dateTime={thread.startedAt}>{formatDate(thread.startedAt)}</time>
            </span>
          </div>
        </div>
      </div>

      <ol className={styles.threadList}>
        {thread.steps.map((step: CareThreadStep, index: number) => {
          const itemClass = getItemClass(step.status);
          const badgeClass = getStatusBadgeClass(step.status);
          const icon = getStepIcon(step.stepType, step.status, index);

          return (
            <li key={step.id || `${step.stepType}-${index}`} className={`${styles.stepItem} ${itemClass}`}>
              <div className={styles.nodeMarker} aria-hidden="true">
                {icon}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <span className={`${styles.stepBadge} ${badgeClass}`}>{formatStatus(step.status)}</span>
                </div>

                <p className={styles.stepDesc}>{step.description}</p>

                {step.timestamp && (
                  <div className={styles.stepTimestamp}>
                    <DualZoneTime
                      value={step.timestamp}
                      counterpartZone={
                        typeof step.metadata?.doctorTimeZone === 'string'
                          ? step.metadata.doctorTimeZone
                          : null
                      }
                    />
                  </div>
                )}

                {step.actionLabel && step.actionUrl && (
                  <div className={styles.stepActionArea}>
                    <Link to={step.actionUrl} className={styles.actionButton}>
                      {step.actionLabel} →
                    </Link>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isPartialConcludedAtConsultation && (
        <div className={styles.partialNotice} role="note">
          <strong>Care Episode Concluded:</strong> Following the consultation, no specialist referrals or diagnostic
          laboratory orders were deemed necessary by {thread.doctorName}. You can review your clinical notes or book a
          follow-up if needed.
        </div>
      )}
    </section>
  );
}
