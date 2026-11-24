import { useT, plainTranslate, type Translate } from '../../../i18n/useT';
import {
  claimItemStatusLabel,
  credentialTypeLabel,
  localizedRequirements,
  noRejectionReason,
  notSubmittedLabel,
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

function stateLabel(state: ChecklistItemState, t: Translate): string {
  return state === 'not_submitted' ? notSubmittedLabel(t) : claimItemStatusLabel(state, t);
}

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
  t: Translate = plainTranslate,
): ChecklistItem[] {
  const byType = latestCredentialByType(credentials);

  const documentItems: ChecklistItem[] = localizedRequirements(t).map((requirement) => {
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
    label: t('verification.checklist.claimLabel', 'Specialty claim: {name}', {
      name: claim.specialty.name,
    }),
    description: t('verification.checklist.claimDescription', 'Reviewed against your specialty certificate.'),
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
  const t = useT();
  const items = deriveChecklistItems(credentials, claims, t);
  const summary = checklistSummary(items);

  return (
    <section className={styles.root} aria-labelledby="verification-checklist-title">
      <h2 className={styles.title} id="verification-checklist-title">
        {t('verification.checklist.title', 'Verification checklist')}
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
          {t(
            'verification.checklist.progress',
            '{percent}% complete — {verified, plural, one {# of {total} items verified} other {# of {total} items verified}}{hasPending, select, yes {, {pending} awaiting review} other {}}{hasRejected, select, yes {, {rejected} rejected} other {}}{hasNotSubmitted, select, yes {, {notSubmitted} not submitted} other {}}',
            {
              percent: summary.percent,
              verified: summary.verified,
              total: summary.total,
              pending: summary.pending,
              rejected: summary.rejected,
              notSubmitted: summary.notSubmitted,
              hasPending: summary.pending > 0 ? 'yes' : 'no',
              hasRejected: summary.rejected > 0 ? 'yes' : 'no',
              hasNotSubmitted: summary.notSubmitted > 0 ? 'yes' : 'no',
            },
          )}
        </p>
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key} className={styles.item} data-status={item.state}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.status} data-status={item.state}>
                {stateLabel(item.state, t)}
              </span>
            </div>
            <p className={styles.itemDescription}>{item.description}</p>
            {item.state === 'rejected' && (
              <p className={styles.reason}>
                <span className={styles.reasonLabel}>{t('verification.reason.label', 'Reason: ')}</span>
                {item.reason || noRejectionReason(t)}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.policy}>
        {t(
          'verification.checklist.policy',
          'This list is the current review policy for doctor applications — {types} — not something stored on your account. An admin reviews every document and every specialty claim separately, which is why each row carries its own status.',
          { types: REQUIRED_CREDENTIALS.map((requirement) => credentialTypeLabel(requirement.type, t)).join(', ') },
        )}
      </p>
    </section>
  );
}
