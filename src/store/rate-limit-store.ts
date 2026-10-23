// Global rate-limit notice state (issue #80). Client-only UI state: whichever
// API call gets a 429 records when retrying becomes safe, and the app shell
// shows one non-blocking notice from it. Deliberately NOT persisted — a
// countdown from a previous page load would be stale.
import { create } from 'zustand';

interface RateLimitState {
  /** Epoch ms after which another attempt is allowed, or null when clear. */
  retryAt: number | null;
  /** Wait the server asked for, kept for display/debugging. */
  retryAfterSeconds: number;
  notify: (retryAfterSeconds: number, now?: number) => void;
  clear: () => void;
}

export const useRateLimitStore = create<RateLimitState>((set) => ({
  retryAt: null,
  retryAfterSeconds: 0,
  notify: (retryAfterSeconds, now = Date.now()) =>
    set({ retryAt: now + Math.max(0, retryAfterSeconds) * 1000, retryAfterSeconds }),
  clear: () => set({ retryAt: null, retryAfterSeconds: 0 }),
}));

/** Record a 429 outside React (called from `api-client.ts`). */
export function notifyRateLimit(retryAfterSeconds: number): void {
  useRateLimitStore.getState().notify(retryAfterSeconds);
}
