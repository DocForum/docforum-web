import { useId } from 'react';
import { Link } from 'react-router-dom';
import { formatAge, oldestAgeMs, sectionDrillDown, sectionTone } from '../sections';
import type { AdminOverviewSection } from '../../../types/models';
import styles from './AdminOverview.module.css';

interface QueueCardProps {
  section: AdminOverviewSection;
  now: number;
}

/**
 * One queue: count, oldest age and a drill-down link. An unavailable
 * section is a muted card — the board never turns one missing queue into an
 * error page.
 */
export function QueueCard({ section, now }: QueueCardProps) {
  const labelId = useId();
  const drill = sectionDrillDown(section.key);

  if (!section.available) {
    return (
      <article className={styles.card} data-tone="neutral" data-testid="queue-card" aria-labelledby={labelId}>
        <p id={labelId} className={styles.cardLabel}>
          {section.label}
        </p>
        <div className={styles.cardValue}>
          <span className={styles.mutedPill}>Unavailable</span>
        </div>
        <p className={styles.cardDetail}>
          docforum-core couldn&apos;t answer for this queue. The rest of the board is still live.
        </p>
        {drill && (
          <Link className={styles.cardLink} to={drill.route}>
            {drill.action}
          </Link>
        )}
      </article>
    );
  }

  const tone = sectionTone(section, now);
  const age = oldestAgeMs(section, now);
  const count = section.count ?? 0;

  return (
    <article className={styles.card} data-tone={tone} data-testid="queue-card" aria-labelledby={labelId}>
      <p id={labelId} className={styles.cardLabel}>
        {section.label}
      </p>
      <div className={styles.cardValue}>
        <span className={styles.cardCount}>{count.toLocaleString('en-GB')}</span>
        <span className={styles.cardCountUnit}>{count === 1 ? 'item waiting' : 'items waiting'}</span>
      </div>
      <p className={styles.cardDetail}>
        {count === 0 ? (
          'Nothing waiting'
        ) : age === null ? (
          'Oldest age not reported'
        ) : (
          <>
            Oldest:{' '}
            <time className={styles.cardAge} dateTime={section.oldestItemCreatedAt ?? undefined}>
              {formatAge(age)}
            </time>
          </>
        )}
      </p>
      {drill && (
        <Link className={styles.cardLink} to={drill.route}>
          {drill.action}
        </Link>
      )}
    </article>
  );
}
