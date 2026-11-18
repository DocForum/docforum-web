// Dev-panel state for mock mode (issue #95). This is client-only UI state
// for the mock tooling itself — not application state, and not part of
// src/store/ (that directory is app state per ARCHITECTURE_ESSENTIALS.md).
import { create } from 'zustand';
import type { Role } from '../types/models';

export type MockScenario = 'normal' | 'empty' | 'error' | 'network-once';

interface MockState {
  scenario: MockScenario;
  latencyMs: number;
  activeRole: Role;
  /** Dev-panel overrides for `/me/flags` (issue #111). */
  flagOverrides: Record<string, boolean>;
  setScenario: (scenario: MockScenario) => void;
  setLatencyMs: (ms: number) => void;
  setActiveRole: (role: Role) => void;
  setFlagOverride: (name: string, enabled: boolean) => void;
  resetFlagOverrides: () => void;
}

export const useMockStore = create<MockState>((set) => ({
  scenario: 'normal',
  latencyMs: 0,
  activeRole: 'patient',
  flagOverrides: {},
  setScenario: (scenario) => set({ scenario }),
  setLatencyMs: (latencyMs) => set({ latencyMs }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setFlagOverride: (name, enabled) =>
    set((state) => ({ flagOverrides: { ...state.flagOverrides, [name]: enabled } })),
  resetFlagOverrides: () => set({ flagOverrides: {} }),
}));
