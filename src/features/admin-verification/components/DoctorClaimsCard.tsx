import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useOptionalT } from '../../../i18n/useOptionalT';
import type { Translator } from '../../../i18n/useT';
import * as verificationService from '../../../services/admin-verification-service';
import { useAuthStore } from '../../../store/auth-store';
import { formatAge, formatBytes, hoursSince } from '../claims';
import type { DoctorClaims } from '../claims';
import type { ClaimDecision, SpecialtyClaim } from '../../../types/models';
import styles from './SpecialtyClaims.module.css';
import { formatInstant } from '../../../i18n/format';

interface DoctorClaimsCardProps {
  group: DoctorClaims;
  now: number;
  onReview: (claim: SpecialtyClaim, decision: ClaimDecision) => void;
}

type AgeTone = 'elevated' | 'high' | 'critical';

function ageTone(hours: number): AgeTone {
  if (hours >= 168) return 'critical';
  if (hours >= 72) return 'high';
  return 'elevated';
}

const TONE_CLASS: Record<AgeTone, string> = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
};

/** Fetches the claim's supporting document and opens it in a new tab via an
 * object URL — the bearer token never lands in a link href. */
function useCredentialOpener(t: Translator) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCredential = async (claim: SpecialtyClaim) => {
    setLoadingId(claim.id);
    setError(null);
    try {
      const blob = await verificationService.fetchClaimCredential(claim.id, accessToken!);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        setError(
          t(
            'adminVerification.claims.popupBlocked',
            'Your browser blocked the new tab — allow pop-ups for this site to view the document.',
          ),
        );
      }
      // Give the new tab time to start loading before the URL dies.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(
        t(
          'adminVerification.claims.documentFailed',
          "Couldn't fetch the document — the preview backend may be waking up. Try again in a minute.",
        ),
      );
    } finally {
      setLoadingId(null);
    }
  };

  return { openCredential, loadingId, error };
}

/** One doctor, their pending specialty claims, and each claim's supporting
 * document beside the approve/reject actions. */
export function DoctorClaimsCard({ group, now, onReview }: DoctorClaimsCardProps) {
  const { locale, t } = useOptionalT();
  const { openCredential, loadingId, error } = useCredentialOpener(t);
  const headingId = `doctor-${group.doctorId}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <h2 id={headingId} className={styles.doctorName}>
          {group.doctorName}
        </h2>
        <span className={styles.claimCount}>
          {t('adminVerification.claims.pendingCount', '{count, plural, one {# pending claim} other {# pending claims}}', {
            count: group.claims.length,
          })}
        </span>
      </div>

      <ul className={styles.claims}>
        {group.claims.map((claim) => {
          const hours = hoursSince(claim.createdAt, now);
          const claimId = `claim-${claim.id}`;
          return (
            <li key={claim.id} className={styles.claim}>
              <div className={styles.claimTop}>
                <h3 id={claimId} className={styles.specialty}>
                  {claim.specialty.name}
                </h3>
                {hours !== null && (
                  <span className={`${styles.age} ${TONE_CLASS[ageTone(hours)]}`}>
                    {t('adminVerification.claims.claimed', 'Claimed {age} ago', { age: formatAge(hours, t) })}
                  </span>
                )}
                <code className={styles.claimId} title={t('adminVerification.claims.claimIdTitle', 'Claim id')}>
                  {claim.id}
                </code>
              </div>

              {claim.credential ? (
                <div className={styles.credential}>
                  <span className={styles.credentialName}>{claim.credential.fileName}</span>
                  <span className={styles.credentialMeta}>
                    {claim.credential.mimeType} · {formatBytes(claim.credential.sizeBytes, t)} ·{' '}
                    {t('adminVerification.claims.uploaded', 'uploaded {date}', {
                      date: formatInstant(claim.credential.uploadedAt, {
                        dateStyle: 'medium',
                      }, locale),
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openCredential(claim)}
                    loading={loadingId === claim.id}
                    aria-describedby={claimId}
                  >
                    {t('adminVerification.claims.viewDocument', 'View document')}
                  </Button>
                </div>
              ) : (
                <p className={`${styles.credential} ${styles.credentialMissing}`}>
                  {t(
                    'adminVerification.claims.noDocument',
                    'No supporting document was attached — approving this claim is a judgement call. Ask for credentials before approving, or reject with what to upload.',
                  )}
                </p>
              )}

              <div className={styles.claimActions}>
                <Button type="button" onClick={() => onReview(claim, 'approve')} aria-describedby={claimId}>
                  {t('adminVerification.decision.approve', 'Approve')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onReview(claim, 'reject')}
                  aria-describedby={claimId}
                >
                  {t('adminVerification.decision.reject', 'Reject')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
