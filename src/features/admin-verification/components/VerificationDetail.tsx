import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { useOptionalT } from '../../../i18n/useOptionalT';
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
  const t = useOptionalT().t;
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
      setError(describeDocumentError(cause, t));
    }
  }

  return (
    <li className={styles.document}>
      <div className={styles.documentMain}>
        <span className={styles.documentName}>{document.fileName}</span>
        <span className={styles.documentMeta}>
          {formatBytes(document.sizeBytes, t)} ·{' '}
          {t('adminVerification.detail.uploaded', 'uploaded {date}', {
            date: formatDateTime(document.uploadedAt),
          })}
        </span>
        {link ? (
          <p className={styles.signedLink}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {t('adminVerification.detail.openDocument', 'Open {fileName}', { fileName: document.fileName })}
            </a>{' '}
            <span className={styles.documentMeta}>({expiryLabel(link.expiresAt, t)})</span>
          </p>
        ) : null}
        {error ? (
          <p className={styles.fieldError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button variant="secondary" size="small" loading={pending} disabled={pending} onClick={() => void mint()}>
        {link
          ? t('adminVerification.detail.newLink', 'Get a new secure link')
          : t('adminVerification.detail.getLink', 'Get secure link')}
      </Button>
    </li>
  );
}

function HistorySection({ doctorProfileId }: { doctorProfileId: string }) {
  const t = useOptionalT().t;
  const history = useVerificationHistory(doctorProfileId);

  return (
    <section className={styles.section} aria-labelledby="decision-history-heading">
      <h2 className={styles.sectionTitle} id="decision-history-heading">
        {t('adminVerification.detail.historyTitle', 'Decision history')}
      </h2>
      {history.isLoading ? (
        <p className={styles.muted}>{t('adminVerification.detail.historyLoading', 'Loading decision history…')}</p>
      ) : null}
      {history.isError ? (
        <p className={styles.noticeWarning} role="status">
          {describeHistoryError(history.error, t)}
        </p>
      ) : null}
      {history.data && history.data.length === 0 ? (
        <p className={styles.muted}>
          {t(
            'adminVerification.detail.historyEmpty',
            'No verification decisions have been recorded for this doctor yet.',
          )}
        </p>
      ) : null}
      {history.data && history.data.length > 0 ? (
        <ul className={styles.history}>
          {history.data.map((decision: VerificationDecision) => (
            <li key={decision.id} className={styles.historyRow}>
              <span>
                {decision.from
                  ? `${statusLabel(decision.from, t)} → ${statusLabel(decision.to, t)}`
                  : t('adminVerification.detail.setTo', 'Set to {status}', { status: statusLabel(decision.to, t) })}
              </span>
              <span className={styles.historyMeta}>
                {formatDateTime(decision.at)} · {shortActor(decision.actorUserId, t)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function VerificationDetail({ doctorProfileId }: { doctorProfileId: string }) {
  const t = useOptionalT().t;
  const detail = useVerification(doctorProfileId);
  const [dialogStatus, setDialogStatus] = useState<DecisionStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The app shell no longer adds a route <h1> (#238), so every state names
  // the page; the loaded state uses the doctor's name instead.
  const pendingTitle = (
    <h1 className={styles.title}>{t('adminVerification.detail.title', 'Verification application')}</h1>
  );

  if (detail.isLoading) {
    return (
      <>
        {pendingTitle}
        <p className={styles.status}>{t('adminVerification.detail.loading', 'Loading application…')}</p>
      </>
    );
  }

  if (detail.isError) {
    return (
      <>
        {pendingTitle}
        <div className={styles.errorBox} role="alert">
          <p>{describeDetailError(detail.error, t)}</p>
          <Link to="/admin/verifications">{t('adminVerification.detail.backToQueue', '← Back to the queue')}</Link>
        </div>
      </>
    );
  }

  const data = detail.data;
  if (!data) return pendingTitle;

  const decided = data.profile.verificationStatus !== 'pending';
  const documents = data.documents;

  return (
    <section className={styles.detail} aria-labelledby="verification-detail-heading">
      <header>
        <p className={styles.queueMeta}>
          {t('adminVerification.detail.applied', 'Applied {date}', { date: formatDateTime(data.profile.submittedAt) })}
        </p>
        <div className={styles.profileHeader}>
          <h1 className={styles.title} id="verification-detail-heading">
            {data.profile.fullName}
          </h1>
          <span className={styles.statusPill} data-status={data.profile.verificationStatus}>
            {statusLabel(data.profile.verificationStatus, t)}
          </span>
        </div>
        <p className={styles.subtitle}>
          {decided
            ? t(
                'adminVerification.detail.alreadyDecided',
                'This application already has a decision. Reviewing again records a new one.',
              )
            : t(
                'adminVerification.detail.reviewPrompt',
                'Review the credentials below, then approve or reject with a reason.',
              )}
        </p>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <div className={styles.profileCard}>
        <dl className={styles.profileFacts}>
          <dt>{t('adminVerification.detail.specialties', 'Specialties')}</dt>
          <dd>
            {data.profile.specialties.length > 0
              ? data.profile.specialties.join(', ')
              : t('adminVerification.detail.noneListed', 'None listed')}
          </dd>
          <dt>{t('adminVerification.detail.email', 'Email')}</dt>
          <dd>{data.profile.email ?? t('adminVerification.detail.emailNotShown', 'Not shown by docforum-core')}</dd>
          <dt>{t('adminVerification.detail.documents', 'Documents')}</dt>
          <dd>
            {documents.length === 0
              ? t('adminVerification.detail.noneSubmitted', 'None submitted')
              : t('adminVerification.detail.documentsSubmitted', '{count} submitted', { count: documents.length })}
          </dd>
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
            {t('adminVerification.decision.approve', 'Approve')}
          </Button>
          <Button
            variant="danger"
            disabled={data.profile.verificationStatus === 'rejected'}
            onClick={() => {
              setNotice(null);
              setDialogStatus('rejected');
            }}
          >
            {t('adminVerification.decision.reject', 'Reject')}
          </Button>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="documents-heading">
        <h2 className={styles.sectionTitle} id="documents-heading">
          {t('adminVerification.detail.documentsTitle', 'Credential documents')}
        </h2>
        <p className={styles.fieldHint}>
          {t(
            'adminVerification.detail.documentsHint',
            'Documents open through links that are signed on demand and expire quickly. Request a fresh one each time.',
          )}
        </p>
        {documents.length === 0 ? (
          <p className={styles.muted}>
            {t(
              'adminVerification.detail.documentsEmpty',
              'No credential documents were submitted with this application.',
            )}
          </p>
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
        <Link to="/admin/verifications">{t('adminVerification.detail.backToQueue', '← Back to the queue')}</Link>
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
                (outcome.status === 'verified'
                  ? t(
                      'adminVerification.detail.approvedNotice',
                      'Approved — the decision was recorded and the queue has been refreshed.',
                    )
                  : t(
                      'adminVerification.detail.rejectedNotice',
                      'Rejected — the decision was recorded and the queue has been refreshed.',
                    )),
            );
          }}
        />
      ) : null}
    </section>
  );
}
