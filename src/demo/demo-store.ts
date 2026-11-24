// Demo-mode UI state (issue #127). Demo-only: nothing outside src/demo/ and
// src/mocks/ imports this. The selected role stays in memory; reloading the
// demo asks the visitor to choose a role again.
import { create } from 'zustand';
import { queryClient } from '../query-client';
import { activateMockRole } from '../mocks/roles';
import type { Role } from '../types/models';

export const DEMO_ROLES: Role[] = ['patient', 'doctor', 'facility', 'admin'];

/** Leave the demo: a full navigation back to the same app without `?demo`,
 * discarding the worker, stores and fixtures along with the document. */
export function exitDemoMode(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('demo');
  url.hash = '';
  window.location.assign(url.toString());
}

interface DemoState {
  role: Role | null;
  pickerOpen: boolean;
  chooseRole: (role: Role, options?: { navigate?: boolean }) => void;
  openPicker: () => void;
  closePicker: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  role: null,
  pickerOpen: true,
  chooseRole: (role, options) => {
    // Drop every cached response first: switching personas must never show
    // the previous role's data (e.g. a doctor's inbox under a facility
    // session) even for a frame.
    queryClient.clear();
    activateMockRole(role, options);
    set({ role, pickerOpen: false });
  },
  openPicker: () => set({ pickerOpen: true }),
  // Backdrop/Escape only closes once a role exists — the picker is the way
  // into the demo, so the first arrival has to choose one.
  closePicker: () => {
    if (get().role) set({ pickerOpen: false });
  },
}));
