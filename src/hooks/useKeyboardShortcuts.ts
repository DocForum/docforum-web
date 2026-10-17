import { useEffect, useRef } from 'react';

export type ShortcutAction =
  | 'open-palette'
  | 'open-help'
  | 'next-patient'
  | 'open-chart'
  | 'sign-note';

export interface ShortcutBinding {
  action: ShortcutAction;
  label: string;
  key: string; // serialized, e.g. 'mod+k'
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'open-palette', label: 'Open command palette', key: 'mod+k' },
  { action: 'open-help', label: 'Shortcuts help', key: 'mod+/' },
  { action: 'next-patient', label: 'Next patient', key: 'mod+j' },
  { action: 'open-chart', label: 'Open chart', key: 'mod+o' },
  { action: 'sign-note', label: 'Sign note', key: 'mod+s' },
];

function serializeKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((target as HTMLElement).isContentEditable) return true;
  return false;
}

export interface UseKeyboardShortcutsOptions {
  bindings: Record<ShortcutAction, string>;
  onAction: (action: ShortcutAction) => void;
  enabled?: boolean;
}

/**
 * Registers global keyboard shortcuts. Shortcuts are suppressed while the
 * user is typing in an input/textarea/select or any contenteditable element,
 * so they never clobber text entry. Bindings are configurable to avoid
 * clashing with assistive technology and can be disabled entirely.
 */
export function useKeyboardShortcuts({
  bindings,
  onAction,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handlerRef = useRef<UseKeyboardShortcutsOptions['onAction']>(onAction);
  handlerRef.current = onAction;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      const key = serializeKey(e);
      for (const [action, boundKey] of Object.entries(bindings)) {
        if (key === boundKey) {
          e.preventDefault();
          handlerRef.current(action as ShortcutAction);
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, JSON.stringify(bindings)]);
}

export function bindingKey(action: ShortcutAction, bindings: Record<ShortcutAction, string>) {
  return bindings[action];
}
