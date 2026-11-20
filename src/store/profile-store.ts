import { create } from 'zustand';
import type { ActingProfile } from '../types/models';
import { useIntakeDraftStore } from './intake-draft-store';
import { useMessageDraftStore } from './message-draft-store';

interface ProfileState {
  profiles: ActingProfile[];
  selectedProfileId: string | null;
  setProfiles: (profiles: ActingProfile[]) => void;
  selectProfile: (id: string) => void;
  clearProfiles: () => void;
  selectedProfile: () => ActingProfile | null;
}

/** A draft belongs to the profile that typed it; switching profiles (or the
 * list resolving to a different one) must not show it to someone else. */
function clearProfileDrafts(): void {
  useIntakeDraftStore.getState().clearAll();
  useMessageDraftStore.getState().clearAll();
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  setProfiles: (profiles) => {
    const current = get().selectedProfileId;
    const stillValid = profiles.some((p) => p.id === current);
    const next = stillValid ? current : profiles.find((p) => p.isSelf)?.id ?? profiles[0]?.id ?? null;
    if (next !== current) clearProfileDrafts();
    set({ profiles, selectedProfileId: next });
  },
  selectProfile: (id) => {
    if (get().selectedProfileId !== id) clearProfileDrafts();
    set({ selectedProfileId: id });
  },
  clearProfiles: () => set({ profiles: [], selectedProfileId: null }),
  selectedProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.selectedProfileId) ?? null;
  },
}));
