import { useEffect } from 'react';
import { useT } from '../i18n/useT';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';

export function useUnsavedChangesGuard(isDirty: boolean, message?: string): void {
  const t = useT();
  const effectiveMessage =
    message ?? t('facilitySettings.unsaved.message', 'You have unsaved changes. Leave this page and discard your changes?');
  const unsavedChangesStore = useUnsavedChangesStore();
  const markDirty = unsavedChangesStore.markDirty;
  const markClean = unsavedChangesStore.markClean;

  // --- Shared-unsaved-changes store registration ---
  // Mirrors the existing useUnsavedChangesWarning pattern: only run the
  // effect body when isDirty is truthy, so the cleanup only fires on unmount
  // or a genuine dirty→clean transition.
  useEffect(() => {
    if (!isDirty) return;
    markDirty();
    return () => markClean();
  }, [isDirty, markDirty, markClean]);

  // --- Browser beforeunload protection ---
  // Fire when the form becomes dirty and remove the listener when it becomes
  // clean or the component unmounts.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = effectiveMessage;
      return effectiveMessage;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, effectiveMessage]);

  // --- In-app navigation blocking (HashRouter links) ---
  // Capture clicks on <a> elements in the capture phase, before the router
  // processes them. This provides navigation blocking for internal links
  // without requiring a data router such as createBrowserRouter.
  useEffect(() => {
    if (!isDirty) return;

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

      // Show the shared confirmation dialog before preventing navigation.
      // If the user confirms (discard changes), allow the navigation.
      // If the user cancels (stay), prevent the navigation.
      if (window.confirm(effectiveMessage)) {
        // User chose to discard changes and leave — do NOT preventDefault();
        // the caller will handle navigation after the dialog response.
        // stopPropagation is not needed since we're not preventing.
      } else {
        // User chose to stay — prevent the navigation.
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Capture click events in the capture phase so the router hasn't yet
    // decided whether to navigate.
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, effectiveMessage]);

  // --- Dialog interaction ---
  // Note: the actual Dialog rendering is handled by the consumer component.
  // This hook only manages the state and triggers (store, click, beforeunload).
  // The consumer should show a Dialog when isDirty is true and a navigation
  // is attempted, and call the stay/leave actions accordingly.
}