import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { KIND_LABELS, ROLES, STATE_LABELS, describeAudience, flagState } from '../flags';
import { LastChanged } from './LastChanged';
import type { LastChange } from './LastChanged';
import type { FeatureFlag } from '../../../types/models';
import styles from './FeatureFlags.module.css';

interface FlagCardProps {
  flag: FeatureFlag;
  lastChange: LastChange;
  now: number;
  saving: boolean;
  onToggle: (flag: FeatureFlag) => void;
  onEdit: (flag: FeatureFlag) => void;
}

export function FlagCard({ flag, lastChange, now, saving, onToggle, onEdit }: FlagCardProps) {
  const state = flagState(flag);
  const headingId = `flag-${flag.id}`;
  const roleLabels = ROLES.filter((role) => flag.targeting.roles.includes(role.value)).map((role) => role.label);

  return (
    <article className={styles.card} aria-labelledby={headingId} aria-busy={saving}>
      <div className={styles.cardTop}>
        <h2 id={headingId} className={styles.flagKey}>
          {flag.key}
        </h2>
        <div className={styles.badges}>
          <span className={styles.statePill} data-state={state}>
            {STATE_LABELS[state]}
          </span>
          <span className={styles.kindBadge}>{KIND_LABELS[flag.kind]}</span>
        </div>
      </div>

      {flag.description && <p className={styles.description}>{flag.description}</p>}

      <p className={styles.audience}>{describeAudience(flag)}</p>

      {flag.kind === 'percentage' && (
        <div className={styles.rollout} data-off={!flag.enabled || undefined}>
          <div className={styles.rolloutTrack} aria-hidden="true">
            <div className={styles.rolloutFill} style={{ width: `${flag.rolloutPercentage ?? 0}%` }} />
          </div>
          <span className={styles.rolloutValue}>{flag.rolloutPercentage ?? 0}%</span>
        </div>
      )}

      <dl className={styles.facts}>
        <div>
          <dt>Roles</dt>
          <dd>{roleLabels.length > 0 ? roleLabels.join(', ') : 'All roles'}</dd>
        </div>
        <div>
          <dt>Allowlist</dt>
          <dd>
            {flag.targeting.userIds.length === 0
              ? 'None'
              : `${flag.targeting.userIds.length} ${flag.targeting.userIds.length === 1 ? 'user' : 'users'}`}
          </dd>
        </div>
      </dl>

      <div className={styles.cardFooter}>
        <LastChanged flag={flag} change={lastChange} now={now} />
        <div className={styles.cardActions}>
          {saving && (
            <span className={styles.saving} role="status">
              <Spinner size={14} />
              Saving…
            </span>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={flag.enabled}
            aria-label={`${flag.key} enabled`}
            className={styles.switch}
            onClick={() => onToggle(flag)}
            disabled={saving}
          >
            <span className={styles.switchThumb} aria-hidden="true" />
          </button>
          <Button type="button" variant="secondary" onClick={() => onEdit(flag)} disabled={saving} aria-describedby={headingId}>
            Edit
          </Button>
        </div>
      </div>
    </article>
  );
}
