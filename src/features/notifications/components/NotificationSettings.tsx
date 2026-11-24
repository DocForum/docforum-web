import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';
import { useAuthStore } from '../../../store/auth-store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../hooks/useNotificationPreferences';
import { PreferenceGrid } from './PreferenceGrid';
import { QuietHoursForm } from './QuietHoursForm';
import type { NotificationChannel, NotificationType, QuietHours, Role } from '../../../types/models';
import styles from './NotificationPreferences.module.css';

/** Each role's defaults are catalogue copy — API roles map to static calls. */
function roleCopy(role: Role, t: ReturnType<typeof useT>): string {
  switch (role) {
    case 'patient':
      return t(
        'notifications.settings.role.patient',
        'Defaults are tuned for patients: appointment, order and referral updates are on; product news is off.',
      );
    case 'doctor':
      return t(
        'notifications.settings.role.doctor',
        'Defaults are tuned for doctors: appointment changes and new patient messages are on; product news is off.',
      );
    case 'facility':
      return t(
        'notifications.settings.role.facility',
        'Defaults are tuned for facility staff: fulfillment and order updates are on; product news is off.',
      );
    case 'admin':
      return t(
        'notifications.settings.role.admin',
        'Defaults are tuned for administrators: security, order and payment updates are on; product news is off.',
      );
  }
}

/**
 * Notification preferences (issue #108): type × channel grid with locked
 * safety-critical rows, quiet hours with an explicit IANA zone, and a save
 * per change (optimistic, with rollback on failure).
 */
export function NotificationSettings() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (preferences.isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner size={20} /> {t('notifications.settings.loading', 'Loading notification preferences…')}
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
              : t('notifications.settings.error', 'Could not load notification preferences.')
          }
        />
        <Button variant="secondary" onClick={() => void preferences.refetch()} loading={preferences.isFetching}>
          {t('common.tryAgain', 'Try again')}
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
        <p className={styles.roleCopy}>{user ? roleCopy(user.role, t) : ''}</p>
        <p className={styles.saveNote} role="status" aria-live="polite">
          {update.isPending
            ? t('notifications.settings.saving', 'Saving…')
            : update.isError
              ? t(
                  'notifications.settings.saveError',
                  'Could not save that change — the previous setting was restored.',
                )
              : t('notifications.settings.saved', 'Changes save automatically.')}
        </p>
      </div>

      <section className={styles.gridSection} aria-labelledby="notification-grid-heading">
        <div className={styles.gridHeader}>
          <div>
            <h2 id="notification-grid-heading" className={styles.gridTitle}>
              {t('notifications.list.heading.panel', 'Notifications')}
            </h2>
            <p className={styles.gridDescription}>
              {t(
                'notifications.settings.gridDescription',
                'Choose how each notification reaches you. Rows marked “Always on” are safety-critical and cannot be disabled.',
              )}
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
          <Spinner size={15} /> {t('notifications.settings.savingOne', 'Saving your preference…')}
        </p>
      )}
    </div>
  );
}
