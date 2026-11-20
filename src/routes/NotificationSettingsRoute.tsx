import { RequireFlag } from '../components/RequireFlag';
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage';

/** Lazy module for `/settings/notifications` (issue #112). The loader
 * already checked the flag; `RequireFlag` keeps the gate live afterwards. */
export function NotificationSettingsRoute() {
  return (
    <RequireFlag name="notification_preferences">
      <NotificationSettingsPage />
    </RequireFlag>
  );
}
