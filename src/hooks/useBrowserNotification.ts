import { useCallback, useState } from 'react';

type Permission = NotificationPermission | 'unsupported';

/** Some browsers (and this repo's test environment) have no Notification API
 * at all; a few expose the global as undefined, which is just as unusable. */
function supported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification !== null;
}

function currentPermission(): Permission {
  return supported() ? Notification.permission : 'unsupported';
}

/**
 * Browser notifications, asked for only when the patient clicks something.
 *
 * `Notification.requestPermission()` resolves immediately from a cached
 * decision, so re-asking after a denial would fire a prompt the patient
 * already refused — that is the nagging this hook exists to prevent. A denied
 * or unsupported permission is therefore never requested again.
 */
export function useBrowserNotification() {
  const [permission, setPermission] = useState<Permission>(currentPermission);

  const requestPermission = useCallback(async () => {
    if (!supported()) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission !== 'default') {
      setPermission(Notification.permission);
      return;
    }
    // jsdom and some older browsers return a value instead of a promise.
    const result = await Promise.resolve(Notification.requestPermission());
    setPermission(result);
  }, []);

  const notify = useCallback((body: string) => {
    if (!supported() || Notification.permission !== 'granted') return;
    new Notification('DocForum', { body });
  }, []);

  return {
    permission,
    canNotify: permission === 'granted',
    /** False once the browser has said no (or has no Notification API at all),
     * so the UI stops offering an opt-in that cannot be honoured. */
    canRequest: permission === 'default',
    requestPermission,
    notify,
  };
}
