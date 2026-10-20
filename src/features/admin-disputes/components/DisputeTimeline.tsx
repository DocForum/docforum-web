import type { DisputeTimelineEntry, DisputeTimelineKind } from '../../../types/models';
import styles from './Disputes.module.css';

const KIND_LABELS: Record<DisputeTimelineKind, string> = {
  opened: 'Reported',
  facility_evidence: 'Facility evidence',
  admin_note: 'Admin note',
  resolved: 'Resolved',
};

const ACTOR_LABELS: Record<DisputeTimelineEntry['actorRole'], string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  facility: 'Facility',
  admin: 'Admin',
  system: 'System',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DisputeTimeline({ entries }: { entries: DisputeTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className={styles.inlineEmpty}>No timeline entries yet.</p>;
  }

  return (
    <ol className={styles.timeline}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.timelineItem} data-kind={entry.kind}>
          <div className={styles.timelineHeader}>
            <span className={styles.timelineKind}>{KIND_LABELS[entry.kind]}</span>
            <time dateTime={entry.at} title={entry.at} className={styles.timelineTime}>
              {formatTimestamp(entry.at)}
            </time>
          </div>
          <p className={styles.timelineSummary}>{entry.summary}</p>
          <p className={styles.timelineActor}>
            {entry.actor} · {ACTOR_LABELS[entry.actorRole]}
          </p>
        </li>
      ))}
    </ol>
  );
}
