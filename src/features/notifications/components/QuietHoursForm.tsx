import { useId, useState } from 'react';
import { listTimeZones } from '../../../i18n/time-zone';
import { isValidClockTime, validateQuietHours } from '../preferences';
import type { QuietHours } from '../../../types/models';
import styles from './NotificationPreferences.module.css';

interface QuietHoursFormProps {
  quietHours: QuietHours;
  saving: boolean;
  onChange: (quietHours: QuietHours) => void;
}

export function QuietHoursForm({ quietHours, saving, onChange }: QuietHoursFormProps) {
  const headingId = useId();
  const startId = useId();
  const endId = useId();
  const zoneId = useId();
  const [error, setError] = useState<string | null>(null);

  const commit = (next: QuietHours) => {
    const validation = validateQuietHours(next);
    setError(validation);
    if (validation) return;
    onChange(next);
  };

  return (
    <section className={styles.quietSection} aria-labelledby={headingId}>
      <div className={styles.quietHeader}>
        <div>
          <h2 id={headingId} className={styles.quietTitle}>
            Quiet hours
          </h2>
          <p className={styles.quietDescription}>
            Pause non-urgent email, SMS and in-app notifications during a daily window.
            Safety-critical lab results and security alerts still get through.
          </p>
        </div>
      </div>

      <label className={styles.enableRow}>
        <input
          type="checkbox"
          role="switch"
          checked={quietHours.enabled}
          disabled={saving}
          onChange={(event) => commit({ ...quietHours, enabled: event.target.checked })}
        />
        <span>Enable quiet hours</span>
      </label>

      <div className={styles.quietFields} data-enabled={quietHours.enabled}>
        <div className={styles.field}>
          <label htmlFor={startId} className={styles.fieldLabel}>
            Start
          </label>
          <input
            id={startId}
            type="time"
            value={quietHours.start}
            disabled={saving || !quietHours.enabled}
            onChange={(event) => {
              if (isValidClockTime(event.target.value)) {
                commit({ ...quietHours, start: event.target.value });
              }
            }}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={endId} className={styles.fieldLabel}>
            End
          </label>
          <input
            id={endId}
            type="time"
            value={quietHours.end}
            disabled={saving || !quietHours.enabled}
            onChange={(event) => {
              if (isValidClockTime(event.target.value)) {
                commit({ ...quietHours, end: event.target.value });
              }
            }}
            className={styles.input}
          />
        </div>

        <div className={`${styles.field} ${styles.zoneField}`}>
          <label htmlFor={zoneId} className={styles.fieldLabel}>
            Time zone
          </label>
          <select
            id={zoneId}
            value={quietHours.timeZone}
            disabled={saving || !quietHours.enabled}
            onChange={(event) => commit({ ...quietHours, timeZone: event.target.value })}
            className={styles.input}
          >
            {listTimeZones().map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {quietHours.start > quietHours.end && quietHours.enabled && (
        <p className={styles.quietHint}>
          This window crosses midnight — it runs from {quietHours.start} through to{' '}
          {quietHours.end} the next day.
        </p>
      )}
      {error && (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
