import { formatWhen, recordLabel, reasonCopy, roleLabel } from '../copy';
import type { AccessLogEvent } from '../../../types/models';
import styles from './AccessLogList.module.css';

/** Deliberately renders only what docforum-core's log returns: no internal
 * ids, no record pointers — a privacy screen that leaks an id is still a
 * leak. */
export function AccessLogList({ events }: { events: AccessLogEvent[] }) {
  if (events.length === 0) {
    return (
      <p className={styles.empty} data-testid="access-log-empty">
        No one has opened your record yet. When a clinician or facility does, it will appear here with the
        reason for the visit or order.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {events.map((event) => (
        <li key={event.id} className={styles.event}>
          <p className={styles.headline}>
            <strong className={styles.actor}>{event.actorName}</strong>
            <span className={styles.role}>{roleLabel(event.actorRole)}</span>
          </p>
          <p className={styles.what}>
            opened {recordLabel(event.recordType)} · <span className={styles.when}>{formatWhen(event.occurredAt)}</span>
          </p>
          <p className={styles.why}>{reasonCopy(event.reason)}</p>
        </li>
      ))}
    </ul>
  );
}
