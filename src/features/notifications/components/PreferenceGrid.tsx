import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from '../preferences';
import type {
  NotificationChannel,
  NotificationPreference,
  NotificationType,
} from '../../../types/models';
import styles from './NotificationPreferences.module.css';

interface PreferenceGridProps {
  preferences: NotificationPreference[];
  saving: boolean;
  onChange: (type: NotificationType, channel: NotificationChannel, enabled: boolean) => void;
}

function enabledFor(
  preferences: NotificationPreference[],
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  return preferences.find((pref) => pref.type === type && pref.channel === channel)?.enabled ?? false;
}

/**
 * Accessible type × channel grid. Every checkbox is individually labelled
 * with its notification type and channel, so a screen reader announces
 * "Critical lab results, email, checked, dimmed" rather than an unlabelled
 * switch. Locked safety-critical rows are `disabled`, which also keeps them
 * untoggleable from the keyboard (issue #108 review criterion).
 */
export function PreferenceGrid({ preferences, saving, onChange }: PreferenceGridProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.grid} aria-label="Notification preferences by type and channel">
        <thead>
          <tr>
            <th scope="col" className={styles.typeColumn}>
              Notification
            </th>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <th key={channel} scope="col" className={styles.channelColumn}>
                {CHANNEL_LABELS[channel]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_TYPES.map((meta) => {
            const reasonId = `lock-reason-${meta.type}`;
            return (
              <tr key={meta.type} className={meta.locked ? styles.lockedRow : undefined}>
                <th scope="row" className={styles.typeCell}>
                  <span className={styles.typeLabel}>
                    {meta.label}
                    {meta.locked && <span className={styles.lockBadge}>Always on</span>}
                  </span>
                  <span className={styles.typeDescription}>{meta.description}</span>
                  {meta.locked && meta.lockedReason && (
                    <span id={reasonId} className={styles.lockReason}>
                      {meta.lockedReason}
                    </span>
                  )}
                </th>
                {NOTIFICATION_CHANNELS.map((channel) => {
                  const checked = enabledFor(preferences, meta.type, channel);
                  return (
                    <td key={channel} className={styles.toggleCell}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={checked}
                          disabled={meta.locked || saving}
                          aria-label={`${meta.label} via ${CHANNEL_LABELS[channel]}`}
                          aria-describedby={meta.locked && meta.lockedReason ? reasonId : undefined}
                          onChange={(event) => onChange(meta.type, channel, event.target.checked)}
                        />
                        <span className={styles.track} aria-hidden="true">
                          <span className={styles.thumb} />
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
