// Toast queue (issue #113). In-memory only; holds UI copy, never
// server-derived records or PHI — callers pass short, already-translated
// messages ("Couldn't mark that as read").
import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  /** One inline action, e.g. "Undo". Activating it dismisses the toast. */
  action?: ToastAction;
  /** Auto-dismiss after this long (paused while hovered or focused).
   * `null` keeps the toast until dismissed. Defaults by tone. */
  durationMs?: number | null;
}

export interface Toast extends Required<Pick<ToastInput, 'message' | 'tone'>> {
  id: string;
  action?: ToastAction;
  durationMs: number | null;
}

/** Defaults sized for reading time: errors and actionable toasts stay longer
 * (WCAG 2.2.1 — and they pause on hover/focus). */
export const TOAST_DURATION_MS: Record<ToastTone, number> = {
  info: 5_000,
  success: 5_000,
  error: 10_000,
};

/** At most this many toasts on screen; older ones are dropped first so a
 * burst of failures cannot cover the page. */
export const MAX_VISIBLE_TOASTS = 3;

interface ToastState {
  toasts: Toast[];
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (input) => {
    nextId += 1;
    const id = `toast-${nextId}`;
    const tone = input.tone ?? 'info';
    const toast: Toast = {
      id,
      message: input.message,
      tone,
      action: input.action,
      durationMs: input.durationMs === undefined ? TOAST_DURATION_MS[tone] : input.durationMs,
    };
    set((state) => ({ toasts: [...state.toasts, toast].slice(-MAX_VISIBLE_TOASTS) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Imperative entry point for code outside React (mutation callbacks). */
export function showToast(input: ToastInput): string {
  return useToastStore.getState().show(input);
}

export function dismissToast(id: string): void {
  useToastStore.getState().dismiss(id);
}
