import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { HISTORY_LIMIT } from '../hooks/useFeatureFlags';
import { auditTrailLink, formatRelative, formatTimestamp, shortId } from '../flags';
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
  return (
    <time dateTime={iso} title={formatTimestamp(iso)}>
      {formatRelative(iso, now)}
    </time>
  );
}

export function LastChanged({ flag, change, now }: LastChangedProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  let text;
  switch (change.status) {
    case 'loading':
      text = 'Loading last change…';
      break;
    case 'unavailable':
      text = 'Last change unavailable — the audit trail couldn’t be loaded.';
      break;
    case 'older':
      text = `Last changed before the latest ${HISTORY_LIMIT} flag changes.`;
      break;
    case 'none':
      text = (
        <>
          No changes recorded since it was created <When iso={flag.createdAt} now={now} />.
        </>
      );
      break;
    case 'found': {
      const { actorUserId, actorRole, createdAt } = change.event;
      let actor;
      if (!actorUserId) actor = 'the system';
      else if (actorUserId === currentUserId) actor = 'you';
      else actor = <span title={actorUserId}>{`${actorRole ?? 'user'} ${shortId(actorUserId)}`}</span>;
      text = (
        <>
          Changed <When iso={createdAt} now={now} /> by {actor}
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
          History
        </Link>
      )}
    </p>
  );
}
