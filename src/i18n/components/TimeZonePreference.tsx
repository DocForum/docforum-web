import { useId } from 'react';
import { useTimeZone } from '../TimeZoneProvider';
import { formatZoneName, getBrowserTimeZone, listTimeZones } from '../time-zone';
import styles from './TimeZonePreference.module.css';

/**
 * User-level display-zone preference (issue #110). Stored on this device —
 * a display preference, not server-derived data. All timestamps elsewhere
 * in the app read this through `useTimeZone`.
 */
export function TimeZonePreference() {
  const { timeZone, setTimeZone } = useTimeZone();
  const selectId = useId();
  const browserZone = getBrowserTimeZone();

  return (
    <section className={styles.section} aria-labelledby={`${selectId}-heading`}>
      <div className={styles.header}>
        <div>
          <h2 id={`${selectId}-heading`} className={styles.title}>
            Time zone
          </h2>
          <p className={styles.description}>
            Times across DocForum are shown in this zone. If it differs from your device
            ({browserZone}), appointment screens show both when a doctor is in another zone.
          </p>
        </div>
      </div>

      <div className={styles.row}>
        <label htmlFor={selectId} className={styles.label}>
          Display time zone
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={timeZone}
          onChange={(event) => setTimeZone(event.target.value)}
        >
          {listTimeZones().map((zone) => (
            <option key={zone} value={zone}>
              {zone} ({formatZoneName(zone)})
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
