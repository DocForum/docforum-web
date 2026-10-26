// Intake form draft store (issue #36).
//
// Keeps intake drafts in memory, keyed by availability slot ID. Drafts survive
// route changes and failed submits within the session but are never persisted
// to localStorage/sessionStorage/IndexedDB (per ARCHITECTURE_ESSENTIALS.md hard
// rule about no storage for server-derived data). Drafts are cleared on:
// - Successful submit
// - Logout (to be integrated with auth-store when issue #2 lands)
// - Profile switch (to be integrated with profile-store when issue #2 lands)
//
// This store is designed to integrate with the booking flow (issue #2) once
// that feature is implemented.

import { create } from 'zustand';

/** A draft of an intake form, keyed by the availability slot being booked. */
export interface IntakeDraft {
  /** The availability slot ID this draft is for. */
  slotId: string;
  /** The draft form data. Mirrors IntakeForm shape but without id/submittedAt. */
  draft: {
    chiefComplaint: string;
    symptomDuration?: string | null;
    severity?: number | null;
    currentMedications: string[];
    allergies: string[];
    notes?: string | null;
  };
  /** When the draft was last updated (ISO timestamp). */
  updatedAt: string;
}

interface IntakeDraftState {
  /** Drafts keyed by slot ID. */
  drafts: Record<string, IntakeDraft>;
  /** Get a draft for a specific slot. */
  getDraft: (slotId: string) => IntakeDraft | undefined;
  /** Save or update a draft for a slot. */
  saveDraft: (slotId: string, draft: IntakeDraft['draft']) => void;
  /** Clear a specific draft (e.g., after successful submit). */
  clearDraft: (slotId: string) => void;
  /** Clear all drafts (e.g., on logout or profile switch). */
  clearAllDrafts: () => void;
}

export const useIntakeDraftStore = create<IntakeDraftState>((set, get) => ({
  drafts: {},

  getDraft: (slotId) => {
    return get().drafts[slotId];
  },

  saveDraft: (slotId, draft) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [slotId]: {
          slotId,
          draft,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

  clearDraft: (slotId) =>
    set((state) => {
      const { [slotId]: removed, ...rest } = state.drafts;
      return { drafts: rest };
    }),

  clearAllDrafts: () => set({ drafts: {} }),
}));
