import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';
import styles from './BlockConflictNotice.module.css';

export interface ConflictEntry {
  key: string;
  /** Who the appointment belongs to, as much as the manager is allowed to know. */
  label: string;
  detail: string;
  time?: string;
}

interface Props {
  entries: ConflictEntry[];
  /** Pre-formatted in the doctor's zone, e.g. "Mon 19 Oct, 13:00-17:00". */
  rangeLabel: string;
  /** 'preview' = before the request, 'server' = what the backend reported back. */
  stage: 'preview' | 'server';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirming?: boolean;
}

/**
 * The one thing this component exists to prevent: a doctor reading "blocked"
 * as "cancelled". Booked appointments inside a blocked range are named, and the
 * wording says out loud that they are left alone.
 */
export function BlockConflictNotice({ entries, rangeLabel, stage, onConfirm, onCancel, confirming }: Props) {
  const t = useT();
  if (entries.length === 0) return null;

  return (
    <div
      className={styles.notice}
      role={stage === 'server' ? 'status' : 'group'}
      aria-live={stage === 'server' ? 'polite' : undefined}
      aria-label={
        stage === 'preview'
          ? t('availability.conflict.ariaLabel', 'Booked appointments inside {range}', { range: rangeLabel })
          : undefined
      }
      data-stage={stage}
    >
      <h4 className={styles.title}>
        {stage === 'preview'
          ? t(
              'availability.conflict.previewTitle',
              '{count, plural, one {# booked appointment is} other {# booked appointments are}} inside {range}',
              { count: entries.length, range: rangeLabel },
            )
          : t(
              'availability.conflict.serverTitle',
              'Left untouched: {count, plural, one {# booked appointment} other {# booked appointments}}',
              { count: entries.length },
            )}
      </h4>
      <p className={styles.explanation}>
        {stage === 'preview'
          ? t(
              'availability.conflict.previewExplanation',
              'Blocking makes the open slots in this range unbookable. It does not cancel the appointments below — each patient keeps their appointment and it stays on your calendar. Confirm only if that is what you intend.',
            )
          : t(
              'availability.conflict.serverExplanation',
              'Your block was applied to the open slots in this range. The backend reported these booked appointments and cancelled none of them.',
            )}
      </p>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.key} className={styles.item}>
            <span className={styles.itemLabel}>{entry.label}</span>
            {entry.time && <span className={styles.itemTime}>{entry.time}</span>}
            <span className={styles.itemDetail}>{entry.detail}</span>
          </li>
        ))}
      </ul>
      {stage === 'preview' && onConfirm && (
        <div className={styles.actions}>
          <Button onClick={onConfirm} loading={confirming}>
            {t('availability.conflict.confirm', 'Block the range, keep these appointments')}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
