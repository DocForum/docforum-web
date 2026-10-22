import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import {
  useCredentialDocumentUrl,
  useVerification,
  useVerificationHistory,
} from '../hooks/useVerifications';
import { DecisionDialog } from './DecisionDialog';
import { describeDetailError, describeDocumentError, describeHistoryError } from '../errors';
import { statusLabel } from '../queue';
import { expiryLabel, formatBytes, formatDateTime, shortActor } from '../format';
import type { DecisionStatus } from '../decision';
import type { CredentialDocument, VerificationDecision } from '../../../types/models';
import styles from './Verifications.module.css';

/**
 * One credential document. The signed URL is minted per click, rendered only
 * while this component holds it, and replaced on every re-request — it is
 * never cached or stored on the document row.
 */
function DocumentRow({ doctorProfileId, document }: { doctorProfileId: string; document: CredentialDocument }) {
  const requestUrl = useCredentialDocumentUrl(doctorProfileId);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = requestUrl.isPending && requestUrl.variables === document.id;

  async function mint() {
    setLink(null);
    setError(null);
    try {
      setLink(await requestUrl.mutateAsync(document.id));
    } catch (cause) {
      setError(describeDocumentError(cause));
    }
  }

  return (
    <li className={styles.document}>
      <div className={styles.documentMain}>
        <span className={styles.documentName}>{document.fileName}</span>
        <span className={styles.documentMeta}>
          {formatBytes(document.sizeBytes)} · uploaded {formatDateTime(document.uploadedAt)}
        </span>
        {link ? (
          <p className={styles.signedLink}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              Open {document.fileName}
            </a>{' '}
            <span className={styles.documentMeta}>({expiryLabel(link.expiresAt)})</span>
          </p>
        ) : null}
        {error ? (
          <p className={styles.fieldError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button variant="secondary" size="small" loading={pending} disabled={pending} onClick={() => void mint()}>
        {link ? 'Get a new secure link' : 'Get secure link'}
      </Button>
    </li>
  );
}

function HistorySection({ doctorProfileId }: { doctorProfileId: string }) {
  const history = useVerificationHistory(doctorProfileId);

  return (
    <section className={styles.section} aria-labelledby="decision-history-heading">
      <h2 className={styles.sectionTitle} id="decision-history-heading">
        Decision history
      </h2>
      {history.isLoading ? <p className={styles.muted}>Loading decision history…</p> : null}
      {history.isError ? (
        <p className={styles.noticeWarning} role="status">
          {describeHistoryError(history.error)}
        </p>
      ) : null}
      {history.data && history.data.length === 0 ? (
        <p className={styles.muted}>No verification decisions have been recorded for this doctor yet.</p>
      ) : null}
      {history.data && history.data.length > 0 ? (
        <ul className={styles.history}>
          {history.data.map((decision: VerificationDecision) => (
            <li key={decision.id} className={styles.historyRow}>
              <span>
                {decision.from
                  ? `${statusLabel(decision.from)} → ${statusLabel(decision.to)}`
                  : `Set to ${statusLabel(decision.to)}`}
              </span>
              <span className={styles.historyMeta}>
                {formatDateTime(decision.at)} · {shortActor(decision.actorUserId)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function VerificationDetail({ doctorProfileId }: { doctorProfileId: string }) {
  const detail = useVerification(doctorProfileId);
  const [dialogStatus, setDialogStatus] = useState<DecisionStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (detail.isLoading) return <p className={styles.status}>Loading application…</p>;

  if (detail.isError) {
    return (
      <div className={styles.errorBox} role="alert">
        <p>{describeDetailError(detail.error)}</p>
        <Link to="/admin/verifications">← Back to the queue</Link>
      </div>
    );
  }

  const data = detail.data;
  if (!data) return null;

  const decided = data.profile.verificationStatus !== 'pending';
  const documents = data.documents;

  return (
    <section className={styles.detail} aria-labelledby="verification-detail-heading">
      <header>
        <p className={styles.queueMeta}>Applied {formatDateTime(data.profile.submittedAt)}</p>
        <div className={styles.profileHeader}>
          <h1 className={styles.title} id="verification-detail-heading">
            {data.profile.fullName}
          </h1>
          <span className={styles.statusPill} data-status={data.profile.verificationStatus}>
            {statusLabel(data.profile.verificationStatus)}
          </span>
        </div>
        <p className={styles.subtitle}>
          {decided
            ? 'This application already has a decision. Reviewing again records a new one.'
            : 'Review the credentials below, then approve or reject with a reason.'}
        </p>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <div className={styles.profileCard}>
        <dl className={styles.profileFacts}>
          <dt>Specialties</dt>
          <dd>{data.profile.specialties.length > 0 ? data.profile.specialties.join(', ') : 'None listed'}</dd>
          <dt>Email</dt>
          <dd>{data.profile.email ?? 'Not shown by docforum-core'}</dd>
          <dt>Documents</dt>
          <dd>{documents.length === 0 ? 'None submitted' : `${documents.length} submitted`}</dd>
        </dl>

        <div className={styles.decisionRow}>
          <Button
            variant="primary"
            disabled={data.profile.verificationStatus === 'verified'}
            onClick={() => {
              setNotice(null);
              setDialogStatus('verified');
            }}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            disabled={data.profile.verificationStatus === 'rejected'}
            onClick={() => {
              setNotice(null);
              setDialogStatus('rejected');
            }}
          >
            Reject
          </Button>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="documents-heading">
        <h2 className={styles.sectionTitle} id="documents-heading">
          Credential documents
        </h2>
        <p className={styles.fieldHint}>
          Documents open through links that are signed on demand and expire quickly. Request a fresh one each time.
        </p>
        {documents.length === 0 ? (
          <p className={styles.muted}>No credential documents were submitted with this application.</p>
        ) : (
          <ul className={styles.documents}>
            {documents.map((document) => (
              <DocumentRow key={document.id} doctorProfileId={doctorProfileId} document={document} />
            ))}
          </ul>
        )}
      </section>

      <HistorySection doctorProfileId={doctorProfileId} />

      <p>
        <Link to="/admin/verifications">← Back to the queue</Link>
      </p>

      {dialogStatus ? (
        <DecisionDialog
          detail={data}
          status={dialogStatus}
          onClose={() => setDialogStatus(null)}
          onDecided={(outcome) => {
            setDialogStatus(null);
            setNotice(
              outcome.message ??
                `${outcome.status === 'verified' ? 'Approved' : 'Rejected'} — the decision was recorded and the ` +
                  'queue has been refreshed.',
            );
          }}
        />
      ) : null}
    </section>
  );
}
