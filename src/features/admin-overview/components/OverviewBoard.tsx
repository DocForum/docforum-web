import { Link } from 'react-router-dom';
import type { OperationsOverview } from '../../../types/models';
import { formatAge } from '../age';
import styles from './AdminOverview.module.css';

interface OverviewBoardProps {
  overview: OperationsOverview;
  now: Date;
}

/**
 * The "what needs attention" board (issue #68): one card per queue with its
 * count, how long the oldest item has waited, and a drill-down link. A queue
 * the backend reports as unavailable is muted, with the reason — it must never
 * turn the board into an error page.
 */
export function OverviewBoard({ overview, now }: OverviewBoardProps) {
  return (
    <ul className={styles.grid} aria-label="Operational queues">
      {overview.queues.map((queue) => {
        const waiting = queue.available && queue.count > 0;
        return (
          <li
            key={queue.key}
            className={`${styles.card} ${!queue.available ? styles.unavailable : ''} ${
              waiting ? styles.attention : styles.clear
            }`}
            data-queue={queue.key}
          >
            <h2 className={styles.cardTitle}>{queue.label}</h2>

            {!queue.available ? (
              <p className={styles.unavailableCopy}>
                Not reporting right now{queue.detail ? ` — ${queue.detail}` : '.'} Other queues are unaffected.
              </p>
            ) : (
              <>
                <p className={styles.count} aria-label={`${queue.count} waiting`}>
                  {queue.count}
                </p>
                <p className={styles.age}>
                  {queue.count === 0 ? 'Nothing waiting' : `Oldest waiting: ${formatAge(queue.oldestAt, now)}`}
                </p>
              </>
            )}

            <Link className={styles.cardLink} to={queue.href}>
              {queue.available ? `Open ${queue.label.toLowerCase()}` : `Open ${queue.label.toLowerCase()} anyway`}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
