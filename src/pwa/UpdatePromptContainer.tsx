import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { UpdatePrompt } from '../components/UpdatePrompt';

/**
 * Registers the service worker (prompt mode) and surfaces the update /
 * offline-ready states. Kept separate from `UpdatePrompt` so the UI can be
 * tested without the PWA virtual module.
 */
export function UpdatePromptContainer() {
  const [dismissed, setDismissed] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new deployment at most once an hour; the banner appears
      // when one is found and the user chooses when to apply it.
      if (!registration) return;
      window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  const close = () => {
    setDismissed(true);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (dismissed) return null;

  return (
    <UpdatePrompt
      needRefresh={needRefresh}
      offlineReady={offlineReady}
      onReload={() => {
        void updateServiceWorker(true);
      }}
      onDismiss={close}
    />
  );
}
