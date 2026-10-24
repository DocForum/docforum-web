import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import type { LabResult } from '../../../types/models';
import { useLabResult } from '../hooks/useLabResults';
import { AbnormalityBadge } from './AbnormalityBadge';
import { formatResultDate } from './LabResultsList';

// Lazy: the viewer (iframe/img + download links) only mounts when a
// result actually has a file — list rows and file-less details never pay
// for it. Native-only rendering, no CDN viewer script (see
// ResultFileViewer).
const ResultFileViewer = lazy(() =>
  import('./ResultFileViewer').then((module) => ({ default: module.ResultFileViewer })),
);

function acknowledgementLine(result: LabResult): string | null {
  if (result.abnormalityFlag === 'normal') return null;
  switch (result.acknowledgementStatus) {
    case 'acknowledged':
      return result.acknowledgedAt
        ? `Your doctor has reviewed this result (${formatResultDate(result.acknowledgedAt)}).`
        : 'Your doctor has reviewed this result.';
    case 'escalated':
      return 'Your doctor was unavailable, so this was escalated — another clinician will pick it up.';
    case 'pending':
      return 'Your doctor has been notified and will follow up if needed.';
    case 'not_required':
    default:
      return 'Your doctor has been notified and will follow up if needed.';
  }
}

/** Detail view for one lab result: status, facility, date, summary, flag,
 * in-app file viewer with download, and — for abnormal/critical — what
 * happens next (doctor notified + acknowledgement status) written to
 * reassure rather than alarm. When the backend withholds a result pending
 * doctor review, the summary/file stay hidden behind a waiting notice. */
export function LabResultDetail({ resultId }: { resultId: string }) {
  const resultQuery = useLabResult(resultId);

  if (resultQuery.isLoading) return <p>Loading…</p>;
  if (resultQuery.isError) {
    const message =
      resultQuery.error instanceof ApiError ? resultQuery.error.message : 'Could not load this result.';
    return (
      <>
        <p>
          <Link to="/patient/results">← Back to results</Link>
        </p>
        <FormError message={message} />
      </>
    );
  }

  const result = resultQuery.data;
  if (!result) return null;

  const nextStep = acknowledgementLine(result);

  return (
    <div>
      <p>
        <Link to="/patient/results">← Back to results</Link>
      </p>
      <div className="card">
        <AbnormalityBadge flag={result.abnormalityFlag} />
        <h2>{result.testName}</h2>
        <p>
          {result.facilityName} · {formatResultDate(result.createdAt)} ·{' '}
          {result.status === 'ready' ? 'Ready' : 'Pending'}
        </p>

        {result.withheldPendingReview ? (
          <>
            <h3>Waiting for your doctor&apos;s review</h3>
            <p>
              This result needs your doctor to review it first. We&apos;ll notify you as soon as it&apos;s
              released — you don&apos;t need to do anything.
            </p>
            {nextStep && <p>{nextStep}</p>}
          </>
        ) : (
          <>
            {result.summary ? (
              <>
                <h3>Summary</h3>
                <p>{result.summary}</p>
              </>
            ) : (
              <p>No summary provided yet.</p>
            )}

            {result.abnormalityFlag !== 'normal' && (
              <>
                <h3>What happens next</h3>
                {result.abnormalityFlag === 'abnormal' ? (
                  <p>
                    This result was flagged as abnormal. Your doctor has been notified and will follow up
                    if needed — you don&apos;t need to chase this.
                  </p>
                ) : (
                  <p>
                    This result was flagged as critical. Your doctor has been notified. If you feel
                    unwell, seek care promptly — don&apos;t wait for a message.
                  </p>
                )}
                {nextStep && <p>{nextStep}</p>}
              </>
            )}

            <h3>Result file</h3>
            {result.resultFileUrl ? (
              <Suspense fallback={<p>Loading viewer…</p>}>
                <ResultFileViewer fileUrl={result.resultFileUrl} testName={result.testName} />
              </Suspense>
            ) : (
              <p>No file attached yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
