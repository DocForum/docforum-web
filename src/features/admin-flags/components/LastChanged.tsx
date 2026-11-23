import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { HISTORY_LIMIT } from '../hooks/useFeatureFlags';
import { auditTrailLink, formatTimestamp, shortId } from '../flags';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import type { AuditEvent, FeatureFlag } from '../../../types/models';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import styles from './FeatureFlags.module.css';

/** What the audit trail says about a flag's most recent change. */
export type LastChange =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'found'; event: AuditEvent }
  /** Not in the page we loaded, and there were more pages. */
  | { status: 'older' }
  /** The whole flag history fits in the page, and this flag isn't in it. */
  | { status: 'none' };

interface LastChangedProps {
  flag: FeatureFlag;
  change: LastChange;
  now: number;
}

function When({ iso, now }: { iso: string; now: number }) {
  const { timeZone } = useTimeZone();
  const { relativeTime } = useFormatters();
  return (
    <time dateTime={iso} title={formatTimestamp(iso, timeZone)}>
      {relativeTime(iso, new Date(now))}
    </time>
  );
}

export function LastChanged({ flag, change, now }: LastChangedProps) {
  const t = useT();
  const currentUserId = useAuthStore((state) => state.user?.id);

  let text;
  switch (change.status) {
    case 'loading':
      text = t('adminFlags.lastChange.loading', 'Loading last change…');
      break;
    case 'unavailable':
      text = t('adminFlags.lastChange.unavailable', 'Last change unavailable — the audit trail could not be loaded.');
      break;
    case 'older':
      text = t('adminFlags.lastChange.older', 'Last changed before the latest {count} flag changes.', { count: HISTORY_LIMIT });
      break;
    case 'none':
      text = (
        <>
          {t('adminFlags.lastChange.none', 'No changes recorded since it was created')}{' '}
          <When iso={flag.createdAt} now={now} />.
        </>
      );
      break;
    case 'found': {
      const { actorUserId, actorRole, createdAt } = change.event;
      let actor;
      if (!actorUserId) actor = t('adminFlags.lastChange.system', 'the system');
      else if (actorUserId === currentUserId) actor = t('adminFlags.lastChange.you', 'you');
      else actor = <span title={actorUserId}>{`${actorRole ? t(`roles.${actorRole}`, actorRole) : t('adminFlags.lastChange.user', 'user')} ${shortId(actorUserId)}`}</span>;
      text = (
        <>
          {t('adminFlags.lastChange.changed', 'Changed')}{' '}
          <When iso={createdAt} now={now} /> {t('adminFlags.lastChange.by', 'by')} {actor}
        </>
      );
      break;
    }
  }

  return (
    <p className={styles.lastChanged}>
      <span>{text}</span>{' '}
      {change.status !== 'loading' && change.status !== 'unavailable' && (
        <Link to={auditTrailLink(flag.id)} className={styles.historyLink}>
          {t('adminFlags.lastChange.history', 'History')}
        </Link>
      )}
    </p>
  );
}
