import { Link, useParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/Button';
import { ResultFlagBadge } from '../features/results/lab/components/ResultFlagBadge';
import { LabResultViewer } from '../features/results/lab/components/LabResultViewer';
import {
  FLAG_EXPLANATION,
  STATUS_LABEL,
  acknowledgementCopy,
  canViewFile,
} from '../features/results/lab/flags';
import { useLabResult } from '../features/results/lab/hooks/useLabResults';
import { ApiError } from '../services/api-client';
import styles from '../features/results/lab/components/LabResults.module.css';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Date unavailable';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Lab result detail (issue #24): summary, doctor-notified reassurance for
 * flagged values, an accessible values table, and a lazy in-app viewer. */
export function LabResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const query = useLabResult(resultId ?? '');

  if (query.isPending) {
    return (
      <div className="container">
        <div className="card" aria-busy="true">
          <p>
            <Spinner size={16} /> Loading your result…
          </p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="container">
        <div className="card" role="alert">
          <h1 className={styles.title}>
            {notFound ? "We couldn't find that result" : "We couldn't load that result"}
          </h1>
          <p>
            {notFound
              ? 'It may have been removed, or this link points at a result that is not on your account.'
              : 'Nothing has changed — your result is still safe. Please try again.'}
          </p>
          <div className={styles.viewerButtons}>
            {!notFound && <Button onClick={() => query.refetch()}>Try again</Button>}
            <Link to="/patient/results">All lab results</Link>
          </div>
        </div>
      </div>
    );
  }

  const result = query.data;
  if (!result) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Lab result</h1>
          <p>We couldn&apos;t find that result on your account.</p>
          <Link to="/patient/results">All lab results</Link>
        </div>
      </div>
    );
  }

  const nextStep = acknowledgementCopy(result.acknowledgement, result.flag);
  const viewable = canViewFile(result.status) && result.file;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <Link to="/patient/results">← All lab results</Link>
        <div className={styles.itemHead}>
          <h1 className={styles.title}>{result.testName}</h1>
          <ResultFlagBadge flag={result.flag} />
        </div>
        <p className={styles.muted}>
          {result.facilityName} · Resulted {formatDate(result.resultedAt)}
          {result.doctorName ? ` · Ordered by ${result.doctorName}` : ''}
        </p>
      </div>

      <div className="card">
        <dl className={styles.details}>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[result.status]}</dd>
          <dt>Summary</dt>
          <dd>{result.summary}</dd>
          <dt>What this means</dt>
          <dd>{FLAG_EXPLANATION[result.flag]}</dd>
        </dl>

        {nextStep && (
          <div className={`${styles.acknowledgement} ${styles[`tone_${nextStep.tone}`]}`} role="status">
            <h2>{nextStep.heading}</h2>
            <p>{nextStep.body}</p>
          </div>
        )}

        {result.status === 'held' && (
          <p className={styles.heldNote}>
            This result is held until your doctor reviews it. That is a routine safety step for some results — it
            does not mean something is wrong. The report will appear here once it is released.
          </p>
        )}

        {result.status === 'pending' && (
          <p className={styles.heldNote}>
            The lab has not released this result yet. You will see it here as soon as it is ready — there is
            nothing you need to do.
          </p>
        )}

        {/* A held result is withheld until review — values and file both
            stay hidden, even if the API sent them. */}
        {result.values.length > 0 && canViewFile(result.status) && (
          <table className={styles.values}>
            <caption>Measured values</caption>
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col" className={styles.numeric}>
                  Result
                </th>
                <th scope="col">Unit</th>
                <th scope="col">Reference range</th>
                <th scope="col">Flag</th>
              </tr>
            </thead>
            <tbody>
              {result.values.map((value) => (
                <tr
                  key={`${value.name}-${value.value}`}
                  className={
                    value.flag === 'critical'
                      ? styles.rowCritical
                      : value.flag === 'abnormal'
                        ? styles.rowFlagged
                        : undefined
                  }
                >
                  <th scope="row">{value.name}</th>
                  <td className={styles.numeric}>{value.value}</td>
                  <td>{value.unit ?? '—'}</td>
                  <td>{value.referenceRange ?? '—'}</td>
                  <td>{value.flag === 'normal' ? 'In range' : value.flag === 'abnormal' ? 'Outside range' : 'Needs attention'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {viewable && result.file && <LabResultViewer resultId={result.id} file={result.file} />}
      </div>
    </div>
  );
}
