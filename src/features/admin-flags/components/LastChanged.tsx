import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { HISTORY_LIMIT } from '../hooks/useFeatureFlags';
import { auditTrailLink, formatRelative, formatTimestamp, shortId } from '../flags';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { useT, useLocale } from '../../../i18n/useT';
import type { AuditEvent, FeatureFlag } from '../../../types/models';
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
  const t = useT();
  const locale = useLocale();
  const { timeZone } = useTimeZone();
  return (
    <time dateTime={iso} title={formatTimestamp(iso, timeZone)}>
      {formatRelative(iso, now, locale, t)}
    </time>
  );
}

export function LastChanged({ flag, change, now }: LastChangedProps) {
  const t = useT();
  const currentUserId = useAuthStore((state) => state.user?.id);

  let text;
  switch (change.status) {
    case 'loading':
      text = t('admin.flags.lastChanged.loading', 'Loading last change…');
      break;
    case 'unavailable':
      text = t(
        'admin.flags.lastChanged.unavailable',
        'Last change unavailable — the audit trail couldn’t be loaded.',
      );
      break;
    case 'older':
      text = t(
        'admin.flags.lastChanged.older',
        'Last changed before the latest {limit} flag changes.',
        { limit: HISTORY_LIMIT },
      );
      break;
    case 'none':
      text = (
        <>
          {t('admin.flags.lastChanged.none', 'No changes recorded since it was created')}{' '}
          <When iso={flag.createdAt} now={now} />.
        </>
      );
      break;
    case 'found': {
      const { actorUserId, actorRole, createdAt } = change.event;
      let actor;
      if (!actorUserId) actor = t('admin.flags.lastChanged.bySystem', 'the system');
      else if (actorUserId === currentUserId) actor = t('admin.flags.lastChanged.byYou', 'you');
      else actor = <span title={actorUserId}>{`${actorRole ?? 'user'} ${shortId(actorUserId)}`}</span>;
      text = (
        <>
          {t('admin.flags.lastChanged.changed', 'Changed')} <When iso={createdAt} now={now} />{' '}
          {t('admin.flags.lastChanged.by', 'by')} {actor}
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
          {t('admin.flags.lastChanged.history', 'History')}
        </Link>
      )}
    </p>
  );
}
