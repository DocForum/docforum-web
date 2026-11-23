// Global API reachability state. Client-only UI state: tracks whether
// docforum-core is reachable or waking up.
// A boot liveness ping or any network/5xx failure marks the API unreachable.
// Any successful request (2xx) clears the unreachable state.
import { create } from 'zustand';

interface ApiReachabilityState {
  isApiReachable: boolean;
  markReachable: () => void;
  markUnreachable: () => void;
  setReachable: (reachable: boolean) => void;
  reset: () => void;
}

export const useApiReachabilityStore = create<ApiReachabilityState>((set) => ({
  isApiReachable: true,
  markReachable: () => set((state) => (state.isApiReachable ? state : { isApiReachable: true })),
  markUnreachable: () => set((state) => (!state.isApiReachable ? state : { isApiReachable: false })),
  setReachable: (reachable: boolean) => set({ isApiReachable: reachable }),
  reset: () => set({ isApiReachable: true }),
}));

export function markApiReachable(): void {
  useApiReachabilityStore.getState().markReachable();
}

export function markApiUnreachable(): void {
  useApiReachabilityStore.getState().markUnreachable();
}
