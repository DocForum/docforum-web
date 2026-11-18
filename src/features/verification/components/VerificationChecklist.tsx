import {
  CLAIM_ITEM_STATUS_LABELS,
  CREDENTIAL_TYPE_LABELS,
  NO_REJECTION_REASON,
  NOT_SUBMITTED_LABEL,
  REQUIRED_CREDENTIALS,
} from '../requirements';
import type {
  ClaimItemStatus,
  CredentialType,
  DoctorCredential,
  DoctorSpecialtyClaim,
} from '../../../types/models';
import styles from './VerificationChecklist.module.css';

/** `not_submitted` is the one state with no backend row behind it — the
 * doctor hasn't uploaded anything for that requirement yet. */
export type ChecklistItemState = ClaimItemStatus | 'not_submitted';

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  state: ChecklistItemState;
  reason: string | null;
}

export interface ChecklistSummary {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  notSubmitted: number;
  percent: number;
}

const STATE_LABELS: Record<ChecklistItemState, string> = {
  ...CLAIM_ITEM_STATUS_LABELS,
  not_submitted: NOT_SUBMITTED_LABEL,
};

/** Latest submission per type wins: resubmitting replaces the rejected file,
 * so the newest row is what the reviewer is actually looking at. */
export function latestCredentialByType(
  credentials: readonly DoctorCredential[],
): Map<CredentialType, DoctorCredential> {
  const latest = new Map<CredentialType, DoctorCredential>();
  for (const credential of credentials) {
    const current = latest.get(credential.type);
    if (!current || new Date(credential.updatedAt) > new Date(current.updatedAt)) {
      latest.set(credential.type, credential);
    }
  }
  return latest;
}

/** The checklist is derived here, client-side: docforum-core#52/#51 expose no
 * checklist endpoint, so the requirement list is review policy
 * (`REQUIRED_CREDENTIALS`) and only the statuses come from the API. */
export function deriveChecklistItems(
  credentials: readonly DoctorCredential[],
  claims: readonly DoctorSpecialtyClaim[] = [],
): ChecklistItem[] {
  const byType = latestCredentialByType(credentials);

  const documentItems: ChecklistItem[] = REQUIRED_CREDENTIALS.map((requirement) => {
    const credential = byType.get(requirement.type);
    return {
      key: `credential:${requirement.type}`,
      label: requirement.label,
      description: requirement.description,
      state: credential ? credential.status : 'not_submitted',
      reason: credential?.rejectionReason ?? null,
    };
  });

  const claimItems: ChecklistItem[] = claims.map((claim) => ({
    key: `claim:${claim.id}`,
    label: `Specialty claim: ${claim.specialty.name}`,
    description: 'Reviewed against your specialty certificate.',
    state: claim.status,
    reason: claim.rejectionReason ?? null,
  }));

  return [...documentItems, ...claimItems];
}

export function checklistSummary(items: readonly ChecklistItem[]): ChecklistSummary {
  const verified = items.filter((item) => item.state === 'verified').length;
  return {
    total: items.length,
    verified,
    rejected: items.filter((item) => item.state === 'rejected').length,
    pending: items.filter((item) => item.state === 'pending').length,
    notSubmitted: items.filter((item) => item.state === 'not_submitted').length,
    percent: items.length === 0 ? 0 : Math.round((verified / items.length) * 100),
  };
}

interface Props {
  credentials: readonly DoctorCredential[];
  claims?: readonly DoctorSpecialtyClaim[];
}

export function VerificationChecklist({ credentials, claims = [] }: Props) {
  const items = deriveChecklistItems(credentials, claims);
  const summary = checklistSummary(items);

  return (
    <section className={styles.root} aria-labelledby="verification-checklist-title">
      <h2 className={styles.title} id="verification-checklist-title">
        Verification checklist
      </h2>

      <div className={styles.progressBlock}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={summary.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby="verification-checklist-progress"
        >
          <div className={styles.progressFill} style={{ width: `${summary.percent}%` }} />
        </div>
        <p className={styles.progressLabel} id="verification-checklist-progress">
          {summary.percent}% complete — {summary.verified} of {summary.total} items verified
          {summary.pending > 0 && `, ${summary.pending} awaiting review`}
          {summary.rejected > 0 && `, ${summary.rejected} rejected`}
          {summary.notSubmitted > 0 && `, ${summary.notSubmitted} not submitted`}
        </p>
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key} className={styles.item} data-status={item.state}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.status} data-status={item.state}>
                {STATE_LABELS[item.state]}
              </span>
            </div>
            <p className={styles.itemDescription}>{item.description}</p>
            {item.state === 'rejected' && (
              <p className={styles.reason}>
                <span className={styles.reasonLabel}>Reason: </span>
                {item.reason || NO_REJECTION_REASON}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.policy}>
        This list is the current review policy for doctor applications — {REQUIRED_CREDENTIALS.map((r) => CREDENTIAL_TYPE_LABELS[r.type]).join(', ')} —
        not something stored on your account. An admin reviews every document and every specialty claim
        separately, which is why each row carries its own status.
      </p>
    </section>
  );
}
