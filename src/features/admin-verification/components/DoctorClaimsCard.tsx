import { useState } from 'react';
import { Button } from '../../../components/Button';
import * as verificationService from '../../../services/admin-verification-service';
import { useAuthStore } from '../../../store/auth-store';
import { formatAge, formatBytes, hoursSince } from '../claims';
import type { DoctorClaims } from '../claims';
import type { ClaimDecision, SpecialtyClaim } from '../../../types/models';
import styles from './SpecialtyClaims.module.css';

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
function useCredentialOpener() {
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
      if (!opened) setError('Your browser blocked the new tab — allow pop-ups for this site to view the document.');
      // Give the new tab time to start loading before the URL dies.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("Couldn't fetch the document — the preview backend may be waking up. Try again in a minute.");
    } finally {
      setLoadingId(null);
    }
  };

  return { openCredential, loadingId, error };
}

/** One doctor, their pending specialty claims, and each claim's supporting
 * document beside the approve/reject actions. */
export function DoctorClaimsCard({ group, now, onReview }: DoctorClaimsCardProps) {
  const { openCredential, loadingId, error } = useCredentialOpener();
  const headingId = `doctor-${group.doctorId}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <h2 id={headingId} className={styles.doctorName}>
          {group.doctorName}
        </h2>
        <span className={styles.claimCount}>
          {group.claims.length} pending {group.claims.length === 1 ? 'claim' : 'claims'}
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
                    Claimed {formatAge(hours)} ago
                  </span>
                )}
                <code className={styles.claimId} title="Claim id">
                  {claim.id}
                </code>
              </div>

              {claim.credential ? (
                <div className={styles.credential}>
                  <span className={styles.credentialName}>{claim.credential.fileName}</span>
                  <span className={styles.credentialMeta}>
                    {claim.credential.mimeType} · {formatBytes(claim.credential.sizeBytes)} · uploaded{' '}
                    {new Date(claim.credential.uploadedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openCredential(claim)}
                    loading={loadingId === claim.id}
                    aria-describedby={claimId}
                  >
                    View document
                  </Button>
                </div>
              ) : (
                <p className={`${styles.credential} ${styles.credentialMissing}`}>
                  No supporting document was attached — approving this claim is a judgement call. Ask for credentials
                  before approving, or reject with what to upload.
                </p>
              )}

              <div className={styles.claimActions}>
                <Button
                  type="button"
                  onClick={() => onReview(claim, 'approve')}
                  aria-describedby={claimId}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onReview(claim, 'reject')}
                  aria-describedby={claimId}
                >
                  Reject
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
