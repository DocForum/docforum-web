import { create } from 'zustand';
import type { ActingProfile } from '../types/models';

interface ProfileState {
  profiles: ActingProfile[];
  selectedProfileId: string | null;
  setProfiles: (profiles: ActingProfile[]) => void;
  selectProfile: (id: string) => void;
  selectedProfile: () => ActingProfile | null;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  setProfiles: (profiles) => {
    const current = get().selectedProfileId;
    const stillValid = profiles.some((p) => p.id === current);
    set({
      profiles,
      selectedProfileId: stillValid ? current : profiles.find((p) => p.isSelf)?.id ?? profiles[0]?.id ?? null,
    });
  },
  selectProfile: (id) => set({ selectedProfileId: id }),
  selectedProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.selectedProfileId) ?? null;
  },
}));
