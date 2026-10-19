import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { MAX_ALLOWLIST, draftFromFlag, reviewDraft } from '../draft';
import { ROLES, describeAudience } from '../flags';
import { FlagDialog } from './FlagDialog';
import { LastChanged } from './LastChanged';
import type { DraftErrors, FlagDraft } from '../draft';
import type { LastChange } from './LastChanged';
import type { UpdateFlagVariables } from '../hooks/useFeatureFlags';
import type { FeatureFlag } from '../../../types/models';
import styles from './FeatureFlags.module.css';

type Step = 'edit' | 'review';

interface FlagChangeDialogProps {
  /** The flag as it was when the admin opened the dialog. */
  flag: FeatureFlag;
  /** The same flag as the list has it now; undefined if it disappeared. */
  liveFlag: FeatureFlag | undefined;
  lastChange: LastChange;
  now: number;
  /** A toggle opens straight on review with `enabled` flipped. */
  initialDraft?: FlagDraft;
  startAt?: Step;
  onClose: () => void;
  onConfirm: (variables: UpdateFlagVariables) => void;
}

/**
 * Two steps: edit the values, then review exactly what will change — field
 * by field, and who the flag reaches before and after — with the latest
 * audit entry beside it. Nothing is sent until the admin confirms.
 */
export function FlagChangeDialog({
  flag,
  liveFlag,
  lastChange,
  now,
  initialDraft,
  startAt = 'edit',
  onClose,
  onConfirm,
}: FlagChangeDialogProps) {
  const fieldId = useId();
  const [base, setBase] = useState(flag);
  const [draft, setDraft] = useState<FlagDraft>(() => initialDraft ?? draftFromFlag(flag));
  const [step, setStep] = useState<Step>(startAt);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const review = reviewDraft(base, draft);
  // Someone else saved this flag while the dialog was open. Confirming would
  // only earn a 409, so offer to start again from what's there now.
  const stale = !liveFlag || liveFlag.updatedAt !== base.updatedAt;

  const update = (patch: Partial<FlagDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFormError(null);
  };

  const goToReview = () => {
    if (!review.ok) {
      setErrors(review.errors);
      return;
    }
    setErrors({});
    if (review.changes.length === 0) {
      setFormError('Nothing has changed yet.');
      return;
    }
    setStep('review');
  };

  const restartFromLatest = () => {
    if (!liveFlag) return;
    setBase(liveFlag);
    setDraft(draftFromFlag(liveFlag));
    setErrors({});
    setFormError(null);
    setStep('edit');
  };

  const confirm = () => {
    if (stale || !review.ok || review.changes.length === 0) return;
    onConfirm({ flag: base, input: review.input });
  };

  const staleWarning = stale && (
    <div className={styles.staleWarning} role="alert">
      <p>
        {liveFlag
          ? 'Someone else changed this flag while you had it open.'
          : 'This flag is no longer in the list — it may have been removed.'}
      </p>
      {liveFlag && (
        <Button type="button" variant="secondary" onClick={restartFromLatest}>
          Start again from the latest
        </Button>
      )}
    </div>
  );

  if (step === 'review' && review.ok && review.changes.length > 0) {
    const turningOff = base.enabled && review.input.enabled === false;
    return (
      <FlagDialog
        title={`Confirm change to ${base.key}`}
        step={step}
        onClose={onClose}
        onSubmit={confirm}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setStep('edit')}>
              Edit details
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={turningOff ? 'danger' : 'primary'} disabled={stale}>
              {turningOff ? 'Turn off' : 'Confirm change'}
            </Button>
          </>
        }
      >
        {staleWarning}
        <table className={styles.changeTable}>
          <caption className={styles.visuallyHidden}>Changes to {base.key}</caption>
          <thead>
            <tr>
              <th scope="col">Setting</th>
              <th scope="col">Now</th>
              <th scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {review.changes.map((change) => (
              <tr key={change.field}>
                <th scope="row">{change.label}</th>
                <td className={styles.before}>{change.before}</td>
                <td className={styles.after}>
                  {change.after}
                  {change.detail && <span className={styles.changeDetail}>{change.detail}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className={styles.audienceDiff}>
          <div>
            <dt>Reaches now</dt>
            <dd>{describeAudience(base)}</dd>
          </div>
          <div>
            <dt>Reaches after</dt>
            <dd>{describeAudience(review.next)}</dd>
          </div>
        </dl>

        {turningOff && (
          <p className={styles.dangerNotice}>
            Everyone currently getting {base.key} loses it as soon as you confirm, allowlisted users included.
          </p>
        )}

        <div className={styles.dialogLastChange}>
          <span className={styles.fieldLabel}>Last change</span>
          <LastChanged flag={base} change={lastChange} now={now} />
        </div>
        <p className={styles.fieldHint}>Your change is recorded in the audit trail under your admin account.</p>
      </FlagDialog>
    );
  }

  const percentageError = errors.rolloutPercentage;
  const userIdsError = errors.userIds;

  return (
    <FlagDialog
      title={`Edit ${base.key}`}
      step={step}
      onClose={onClose}
      onSubmit={goToReview}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={stale}>
            Review change
          </Button>
        </>
      }
    >
      {staleWarning}
      {base.description && <p className={styles.dialogDescription}>{base.description}</p>}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={draft.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
        <span>
          <span className={styles.checkboxLabel}>Enabled</span>
          <span className={styles.fieldHint}>The kill switch. Off means off for everyone, allowlist included.</span>
        </span>
      </label>

      {base.kind === 'percentage' && (
        <div className={styles.field}>
          <label htmlFor={`${fieldId}-pct`} className={styles.fieldLabel}>
            Rollout percentage
          </label>
          <p id={`${fieldId}-pct-hint`} className={styles.fieldHint}>
            Whole number from 0 to 100. Buckets are sticky per user, so raising it keeps everyone who already has
            the flag.
          </p>
          <div className={styles.percentInput}>
            <input
              id={`${fieldId}-pct`}
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={draft.rolloutPercentage}
              onChange={(event) => {
                update({ rolloutPercentage: event.target.value });
                if (percentageError) setErrors((current) => ({ ...current, rolloutPercentage: undefined }));
              }}
              aria-invalid={Boolean(percentageError)}
              aria-describedby={`${fieldId}-pct-hint${percentageError ? ` ${fieldId}-pct-error` : ''}`}
            />
            <span aria-hidden="true">%</span>
          </div>
          {percentageError && (
            <p id={`${fieldId}-pct-error`} className={styles.fieldError} role="alert">
              {percentageError}
            </p>
          )}
        </div>
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>Roles</legend>
        <p className={styles.fieldHint}>Leave every role unticked to target everyone.</p>
        <div className={styles.roleOptions}>
          {ROLES.map((role) => (
            <label key={role.value} className={styles.roleOption}>
              <input
                type="checkbox"
                checked={draft.roles.includes(role.value)}
                onChange={(event) =>
                  update({
                    roles: event.target.checked
                      ? [...draft.roles, role.value]
                      : draft.roles.filter((value) => value !== role.value),
                  })
                }
              />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={`${fieldId}-users`} className={styles.fieldLabel}>
          User allowlist
        </label>
        <p id={`${fieldId}-users-hint`} className={styles.fieldHint}>
          User ids, one per line (up to {MAX_ALLOWLIST}). They get the flag whenever it’s enabled, whatever the roles
          and percentage say.
        </p>
        <textarea
          id={`${fieldId}-users`}
          className={styles.textarea}
          rows={4}
          spellCheck={false}
          value={draft.userIds}
          onChange={(event) => {
            update({ userIds: event.target.value });
            if (userIdsError) setErrors((current) => ({ ...current, userIds: undefined }));
          }}
          aria-invalid={Boolean(userIdsError)}
          aria-describedby={`${fieldId}-users-hint${userIdsError ? ` ${fieldId}-users-error` : ''}`}
        />
        {userIdsError && (
          <p id={`${fieldId}-users-error`} className={styles.fieldError} role="alert">
            {userIdsError}
          </p>
        )}
      </div>

      <FormError message={formError} />
    </FlagDialog>
  );
}
