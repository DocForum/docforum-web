import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  /** Milliseconds before auto-dismiss. 0 keeps the toast until dismissed. */
  duration: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${++nextId}`;
    // Newest first, capped so a burst can't cover the page.
    set((state) => ({ toasts: [{ ...toast, id }, ...state.toasts].slice(0, 4) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

function show(tone: ToastTone, message: string, options: ToastOptions = {}) {
  return useToastStore.getState().push({
    tone,
    message,
    // Errors stay long enough to read; actions (undo) get a little longer.
    duration: options.duration ?? (tone === 'error' ? 8000 : options.action ? 7000 : 5000),
    action: options.action,
  });
}

/** Imperative toast helpers — callable from hooks and services without a
 * provider. Toasts complement inline form errors, never replace them. */
export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
