import { Link } from 'react-router-dom';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { useMyLabResults } from '../hooks/useLabResults';
import { AbnormalityBadge } from './AbnormalityBadge';

export function formatResultDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Patient's lab-results list: one row per result with status, facility,
 * date, summary, and the abnormality flag. Navigates to the detail view
 * (see PatientResultDetailPage); standalone until issue #5's orders list
 * exists to link from — that dependency is navigation-only, not data. */
export function LabResultsList() {
  const resultsQuery = useMyLabResults();

  if (resultsQuery.isLoading) return <p>Loading…</p>;
  if (resultsQuery.isError) {
    const message =
      resultsQuery.error instanceof ApiError ? resultsQuery.error.message : 'Could not load your results.';
    return <FormError message={message} />;
  }

  const results = resultsQuery.data ?? [];
  if (results.length === 0) {
    return (
      <div className="card">
        <h2>Lab results</h2>
        <p>No results yet — when a facility attaches a result to one of your lab orders, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Lab results</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {results.map((result: LabResult) => (
          <li
            key={result.id}
            style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4) 0' }}
          >
            <AbnormalityBadge flag={result.abnormalityFlag} />
            <h3 style={{ marginBottom: 'var(--space-1)' }}>
              <Link to={`/patient/results/${result.id}`}>{result.testName}</Link>
            </h3>
            <p style={{ marginBottom: 'var(--space-1)' }}>
              {result.facilityName} · {formatResultDate(result.createdAt)} ·{' '}
              {result.status === 'ready' ? 'Ready' : 'Pending'}
            </p>
            {!result.withheldPendingReview && result.summary && <p>{result.summary}</p>}
            {result.withheldPendingReview && <p>Waiting for your doctor&apos;s review before release.</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
