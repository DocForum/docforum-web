import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { act, render, screen } from '../test/render';
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from './useKeyboardShortcuts';

function press(target: Element, key: string, opts: Record<string, unknown> = {}) {
  let defaultPrevented = false;
  act(() => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    });
    target.dispatchEvent(event);
    defaultPrevented = event.defaultPrevented;
  });
  return defaultPrevented;
}

function ShortcutProbe({
  bindings,
  enabled = true,
}: {
  bindings?: Record<string, string>;
  enabled?: boolean;
}) {
  const [last, setLast] = useState<string | null>(null);
  const defaultBindings: Record<string, string> = Object.fromEntries(
    DEFAULT_SHORTCUTS.map((b) => [b.action, b.key]),
  );
  useKeyboardShortcuts({
    bindings: (bindings ?? defaultBindings) as Record<string, string>,
    onAction: setLast,
    enabled,
  });
  return (
    <>
      <input data-testid="input" />
      <div data-testid="target">target</div>
      <span data-testid="last">{last ?? 'none'}</span>
    </>
  );
}

describe('useKeyboardShortcuts', () => {
  it('fires a bound shortcut when not in an input', () => {
    render(<ShortcutProbe />);
    const target = screen.getByTestId('target');
    press(target, 'k', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('open-palette');
  });

  it('does not fire without the modifier', () => {
    render(<ShortcutProbe />);
    const target = screen.getByTestId('target');
    press(target, 'k');
    expect(screen.getByTestId('last').textContent).toBe('none');
  });

  it('is suppressed while typing in an input', () => {
    render(<ShortcutProbe />);
    const input = screen.getByTestId('input');
    input.focus();
    press(input, 'k', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('none');
  });

  it('is suppressed in a contenteditable element', () => {
    render(<ShortcutProbe />);
    const ce = document.createElement('div');
    ce.contentEditable = 'true';
    ce.setAttribute('data-testid', 'ce');
    document.body.appendChild(ce);
    press(ce, 'k', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('none');
    document.body.removeChild(ce);
  });

  it('supports configurable bindings', () => {
    render(<ShortcutProbe bindings={{ 'open-palette': 'mod+p' }} />);
    const target = screen.getByTestId('target');
    press(target, 'p', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('open-palette');
    press(target, 'k', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('open-palette');
  });

  it('can be disabled', () => {
    render(<ShortcutProbe enabled={false} />);
    const target = screen.getByTestId('target');
    press(target, 'k', { metaKey: true });
    expect(screen.getByTestId('last').textContent).toBe('none');
  });

  it('prevents default on matched shortcuts', () => {
    render(<ShortcutProbe />);
    const target = screen.getByTestId('target');
    expect(press(target, 'k', { metaKey: true })).toBe(true);
  });
});
