// In-memory message drafts (issue #22). Message bodies are PHI, so drafts are
// never written to localStorage, sessionStorage or IndexedDB — the repo's
// storage rule. They live for the session only (surviving in-app navigation
// between the inbox and a thread) and are cleared on send or logout.
import { create } from 'zustand';

interface MessageDraftState {
  drafts: Record<string, string>;
  setDraft: (threadId: string, body: string) => void;
  clearDraft: (threadId: string) => void;
  clearAll: () => void;
}

export const useMessageDraftStore = create<MessageDraftState>((set) => ({
  drafts: {},
  setDraft: (threadId, body) =>
    set((state) => ({ drafts: { ...state.drafts, [threadId]: body } })),
  clearDraft: (threadId) =>
    set((state) => {
      if (!(threadId in state.drafts)) return state;
      const next = { ...state.drafts };
      delete next[threadId];
      return { drafts: next };
    }),
  clearAll: () => set({ drafts: {} }),
}));
