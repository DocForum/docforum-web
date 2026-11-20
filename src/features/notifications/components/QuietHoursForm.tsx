import { useId, useState } from 'react';
import { TimePicker } from '../../../components/TimePicker';
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
        {/* The zone is chosen in its own field below, so the pickers don't
            repeat it (issue #114). */}
        <div className={styles.field}>
          <TimePicker
            id={startId}
            label="Start"
            value={quietHours.start}
            timeZone={quietHours.timeZone}
            hideTimeZone
            disabled={saving || !quietHours.enabled}
            onChange={(value) => {
              if (isValidClockTime(value)) commit({ ...quietHours, start: value });
            }}
          />
        </div>

        <div className={styles.field}>
          <TimePicker
            id={endId}
            label="End"
            value={quietHours.end}
            timeZone={quietHours.timeZone}
            hideTimeZone
            disabled={saving || !quietHours.enabled}
            onChange={(value) => {
              if (isValidClockTime(value)) commit({ ...quietHours, end: value });
            }}
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
