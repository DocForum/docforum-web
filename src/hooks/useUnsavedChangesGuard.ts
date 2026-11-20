import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';

interface PendingNavigation {
  anchor: HTMLAnchorElement;
  href: string;
}

export interface UnsavedChangesGuard {
  /** Destination the user asked for while the form was dirty, or null. */
  pendingHref: string | null;
  /** Discard the changes and continue to `pendingHref`. */
  confirmLeave: () => void;
  /** Stay on the page; focus returns to the link that was activated. */
  cancelLeave: () => void;
}

export interface UnsavedChangesGuardOptions {
  /** Overrides the translated "unsaved changes" prompt text. */
  message?: string;
  /**
   * In-app navigation prompt. `dialog` stops the click and exposes
   * `pendingHref` so the caller can render the shared `Dialog` (issue #241);
   * `browser` keeps the native `window.confirm` for callers that render none.
   */
  confirmWith?: 'browser' | 'dialog';
}

/**
 * Warns before a full page unload and intercepts in-app link navigation
 * while either editor has unsaved changes. HashRouter links are normal
 * anchors, so a capture-phase click listener is enough to stop the router
 * before it navigates.
 *
 * With `confirmWith: 'dialog'`, in-app navigation is confirmed with the shared
 * `Dialog` (issue #241): the hook reports the blocked destination so the page
 * can render an accessible dialog, then replays the original click when the
 * user confirms. Only the browser's own unload prompt (`beforeunload`) is left
 * native, because the browser owns that UI.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  options: UnsavedChangesGuardOptions = {},
): UnsavedChangesGuard {
  const t = useT();
  const confirmWith = options.confirmWith ?? 'browser';
  const message =
    options.message ??
    t(
      'facilitySettings.unsaved.message',
      'You have unsaved changes. Leave this page and discard your changes?',
    );

  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  pendingRef.current = pending;
  const bypassRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const handleClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
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

      if (confirmWith === 'dialog') {
        // Stop the router now; the dialog decides whether the click is replayed.
        event.preventDefault();
        event.stopPropagation();
        setPending({ anchor, href: nextUrl.href });
      } else if (!window.confirm(message)) {
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
  }, [confirmWith, isDirty, message]);

  // Clearing `isDirty` (or unmounting) must not leave a stale dialog behind.
  useEffect(() => {
    if (!isDirty) setPending(null);
  }, [isDirty]);

  const confirmLeave = useCallback(() => {
    const target = pendingRef.current;
    setPending(null);
    if (!target) return;
    bypassRef.current = true;
    try {
      target.anchor.click();
    } finally {
      bypassRef.current = false;
    }
  }, []);

  const cancelLeave = useCallback(() => {
    setPending(null);
  }, []);

  return {
    pendingHref: pending?.href ?? null,
    confirmLeave,
    cancelLeave,
  };
}
