import { Link } from 'react-router-dom';
import { EmptyState } from '../../../../components/states/EmptyState';
import { InlineError } from '../../../../components/states/InlineError';
import { Skeleton } from '../../../../components/states/Skeleton';
import type { LabResultSummary } from '../../../../types/models';
import { STATUS_LABEL, canViewFile } from '../flags';
import { ResultFlagBadge } from './ResultFlagBadge';
import styles from './LabResults.module.css';
import { formatInstant } from '../../../../i18n/format';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return formatInstant(date, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A held/pending result has no file yet; say so instead of linking to an
 * empty viewer. */
function availabilityLine(result: LabResultSummary): string {
  if (result.status === 'pending') return 'The lab has not released this result yet.';
  if (result.status === 'held') return 'Your doctor is reviewing this before it is released to you.';
  if (!canViewFile(result.status)) return '';
  return 'Open to see the full report and what it means.';
}

export interface LabResultListProps {
  results: LabResultSummary[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function LabResultList({ results, isPending, isError, onRetry }: LabResultListProps) {
  if (isPending) {
    return (
      <div className="card" aria-busy="true">
        <Skeleton lines={4} label="Loading your lab results" />
      </div>
    );
  }

  if (isError) {
    return (
      <InlineError
        title="We couldn't load your lab results"
        message="Nothing has changed — your results are still with the lab. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No lab results yet"
        description="When a lab sends a result for one of your orders, it will appear here with a plain-language summary."
        action={{ label: 'Back to your care summary', to: '/patient' }}
      />
    );
  }

  return (
    <ul className={styles.list}>
      {results.map((result) => (
        <li key={result.id} className={`card ${styles.item}`}>
          <div className={styles.itemHead}>
            <h2 className={styles.itemTitle}>
              <Link to={`/patient/results/${result.id}`}>{result.testName}</Link>
            </h2>
            <ResultFlagBadge flag={result.flag} />
          </div>
          <p className={styles.meta}>
            {result.facilityName} · {formatDate(result.resultedAt)}
          </p>
          <p className={styles.summary}>{result.summary}</p>
          <p className={styles.status} data-status={result.status}>
            {STATUS_LABEL[result.status]} — {availabilityLine(result)}
          </p>
        </li>
      ))}
    </ul>
  );
}
