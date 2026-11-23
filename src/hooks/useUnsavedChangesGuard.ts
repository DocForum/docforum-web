import { useEffect } from 'react';
import { useT } from '../i18n/useT';

/**
 * Warns before a full page unload and intercepts in-app link navigation
 * while either editor has unsaved changes. HashRouter links are normal
 * anchors, so a capture-phase click listener is enough to stop the router
 * before it navigates.
 */
export function useUnsavedChangesGuard(isDirty: boolean, message?: string): void {
  const t = useT();
  const effectiveMessage =
    message ?? t('facilitySettings.unsaved.message', 'You have unsaved changes. Leave this page and discard your changes?');

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = effectiveMessage;
      return effectiveMessage;
    };

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.href === window.location.href) return;

      if (!window.confirm(effectiveMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, effectiveMessage]);
}
