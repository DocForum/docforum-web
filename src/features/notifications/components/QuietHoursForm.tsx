import { useId, useState } from 'react';
import { TimePicker } from '../../../components/TimePicker';
import { useT } from '../../../i18n/useT';
import { listTimeZones } from '../../../i18n/time-zone';
import { isValidClockTime, validateQuietHours, type QuietHoursError } from '../preferences';
import type { QuietHours } from '../../../types/models';
import styles from './NotificationPreferences.module.css';

interface QuietHoursFormProps {
  quietHours: QuietHours;
  saving: boolean;
  onChange: (quietHours: QuietHours) => void;
}

export function QuietHoursForm({ quietHours, saving, onChange }: QuietHoursFormProps) {
  const t = useT();
  const headingId = useId();
  const startId = useId();
  const endId = useId();
  const zoneId = useId();
  const [error, setError] = useState<QuietHoursError | null>(null);

  const commit = (next: QuietHours) => {
    const validation = validateQuietHours(next);
    setError(validation);
    if (validation) return;
    onChange(next);
  };

  const errorCopy = (code: QuietHoursError): string => {
    switch (code) {
      case 'invalidTime':
        return t('notifications.quiet.error.invalidTime', 'Quiet hours must use a valid 24-hour time.');
      case 'sameTime':
        return t('notifications.quiet.error.sameTime', 'Quiet hours must start and end at different times.');
    }
  };

  return (
    <section className={styles.quietSection} aria-labelledby={headingId}>
      <div className={styles.quietHeader}>
        <div>
          <h2 id={headingId} className={styles.quietTitle}>
            {t('notifications.quiet.title', 'Quiet hours')}
          </h2>
          <p className={styles.quietDescription}>
            {t(
              'notifications.quiet.description',
              'Pause non-urgent email, SMS and in-app notifications during a daily window. Safety-critical lab results and security alerts still get through.',
            )}
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
        <span>{t('notifications.quiet.enable', 'Enable quiet hours')}</span>
      </label>

      <div className={styles.quietFields} data-enabled={quietHours.enabled}>
        {/* The zone is chosen in its own field below, so the pickers don't
            repeat it (issue #114). */}
        <div className={styles.field}>
          <TimePicker
            id={startId}
            label={t('notifications.quiet.start', 'Start')}
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
            label={t('notifications.quiet.end', 'End')}
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
            {t('notifications.quiet.timeZone', 'Time zone')}
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
          {t(
            'notifications.quiet.crossesMidnight',
            'This window crosses midnight — it runs from {start} through to {end} the next day.',
            { start: quietHours.start, end: quietHours.end },
          )}
        </p>
      )}
      {error && (
        <p className={styles.inlineError} role="alert">
          {errorCopy(error)}
        </p>
      )}
    </section>
  );
}
