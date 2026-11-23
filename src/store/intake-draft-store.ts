// Intake drafts (issue #36). PHI in progress, so these live in memory only —
// never localStorage, sessionStorage or IndexedDB. Persisting them server-side
// (or to browser storage) is exactly what the repo's storage rule forbids.
//
// Keyed by availability slot: the slot is what the patient is filling the form
// for, and if it expires the answers survive until a new slot is picked.
import { create } from 'zustand';
import type { IntakeDraft } from '../types/models';

interface IntakeDraftState {
  drafts: Record<string, IntakeDraft>;
  saveDraft: (slotId: string, draft: Omit<IntakeDraft, 'slotId' | 'savedAt'>) => void;
  clearDraft: (slotId: string) => void;
  clearAll: () => void;
}

export const useIntakeDraftStore = create<IntakeDraftState>((set) => ({
  drafts: {},
  saveDraft: (slotId, draft) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [slotId]: { ...draft, slotId, savedAt: new Date().toISOString() },
      },
    })),
  clearDraft: (slotId) =>
    set((state) => {
      if (!(slotId in state.drafts)) return state;
      const next = { ...state.drafts };
      delete next[slotId];
      return { drafts: next };
    }),
  clearAll: () => set({ drafts: {} }),
}));
