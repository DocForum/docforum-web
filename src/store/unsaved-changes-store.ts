// Tracks how many mounted forms currently hold unsaved input, so the
// idle-timeout warning (issue #82) can tell the user when signing them
// out would lose typed-but-unsaved data. Client-only UI state.
import { create } from 'zustand';

interface UnsavedChangesState {
  /** Number of mounted forms currently holding unsaved input. */
  count: number;
  markDirty: () => void;
  markClean: () => void;
  reset: () => void;
}

export const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  count: 0,
  markDirty: () => set((state) => ({ count: state.count + 1 })),
  markClean: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
  reset: () => set({ count: 0 }),
}));
