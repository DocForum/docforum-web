import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { Button } from '../../../components/Button';
import { useAuthStore } from '../../../store/auth-store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../hooks/useNotificationPreferences';
import { PreferenceGrid } from './PreferenceGrid';
import { QuietHoursForm } from './QuietHoursForm';
import type { NotificationChannel, NotificationType, QuietHours } from '../../../types/models';
import styles from './NotificationPreferences.module.css';

const ROLE_COPY = {
  patient: 'Defaults are tuned for patients: appointment, order and referral updates are on; product news is off.',
  doctor: 'Defaults are tuned for doctors: appointment changes and new patient messages are on; product news is off.',
  facility: 'Defaults are tuned for facility staff: fulfillment and order updates are on; product news is off.',
  admin: 'Defaults are tuned for administrators: security, order and payment updates are on; product news is off.',
} as const;

/**
 * Notification preferences (issue #108): type × channel grid with locked
 * safety-critical rows, quiet hours with an explicit IANA zone, and a save
 * per change (optimistic, with rollback on failure).
 */
export function NotificationSettings() {
  const user = useAuthStore((state) => state.user);
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (preferences.isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner size={20} /> Loading notification preferences…
      </div>
    );
  }

  if (preferences.isError || !preferences.data) {
    return (
      <div>
        <FormError
          message={
            preferences.error instanceof Error
              ? preferences.error.message
              : 'Could not load notification preferences.'
          }
        />
        <Button variant="secondary" onClick={() => void preferences.refetch()} loading={preferences.isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const data = preferences.data;

  const handleToggle = (type: NotificationType, channel: NotificationChannel, enabled: boolean) => {
    update.mutate({ preferences: [{ type, channel, enabled }] });
  };

  const handleQuietHours = (quietHours: QuietHours) => {
    update.mutate({ quietHours });
  };

  return (
    <div className={styles.settings}>
      <div className={styles.intro}>
        <p className={styles.roleCopy}>{user ? ROLE_COPY[user.role] : ''}</p>
        <p className={styles.saveNote} role="status" aria-live="polite">
          {update.isPending
            ? 'Saving…'
            : update.isError
              ? 'Could not save that change — the previous setting was restored.'
              : 'Changes save automatically.'}
        </p>
      </div>

      <section className={styles.gridSection} aria-labelledby="notification-grid-heading">
        <div className={styles.gridHeader}>
          <div>
            <h2 id="notification-grid-heading" className={styles.gridTitle}>
              Notifications
            </h2>
            <p className={styles.gridDescription}>
              Choose how each notification reaches you. Rows marked “Always on” are
              safety-critical and cannot be disabled.
            </p>
          </div>
        </div>
        <PreferenceGrid preferences={data.preferences} saving={update.isPending} onChange={handleToggle} />
      </section>

      <QuietHoursForm
        quietHours={data.quietHours}
        saving={update.isPending}
        onChange={handleQuietHours}
      />

      {update.isPending && (
        <p className={styles.saving} role="status">
          <Spinner size={15} /> Saving your preference…
        </p>
      )}
    </div>
  );
}
