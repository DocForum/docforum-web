// Opt-in dirty tracking for forms: pass whether the form currently holds
// unsaved input and the idle-timeout warning will mention it (issue #82).
import { useEffect } from 'react';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';

export function useUnsavedChangesWarning(isDirty: boolean) {
  const markDirty = useUnsavedChangesStore((state) => state.markDirty);
  const markClean = useUnsavedChangesStore((state) => state.markClean);

  useEffect(() => {
    if (!isDirty) return;
    markDirty();
    return () => markClean();
  }, [isDirty, markDirty, markClean]);
}
