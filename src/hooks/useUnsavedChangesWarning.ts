// Warn before leaving a page with unsaved changes (issue #36).
//
// Uses the browser's beforeunload event to show a confirmation dialog when
// the user navigates away with unsaved form data. This is a standard browser
// pattern that cannot be customized (the browser shows its own message).
//
// Only active when hasUnsavedChanges is true. Automatically cleans up on
// unmount.

import { useEffect } from 'react';

interface UseBeforeUnloadWarningOptions {
  /** Whether there are unsaved changes. */
  hasUnsavedChanges: boolean;
  /** Optional custom message (not all browsers show this). */
  message?: string;
}

export function useBeforeUnloadWarning({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseBeforeUnloadWarningOptions) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern browsers ignore the custom message and show their own.
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);
}

// Backward-compatible wrapper for existing code that passes a boolean directly
export function useUnsavedChangesWarning(
  options: boolean | UseBeforeUnloadWarningOptions,
) {
  if (typeof options === 'boolean') {
    return useBeforeUnloadWarning({ hasUnsavedChanges: options });
  }
  return useBeforeUnloadWarning(options);
}
