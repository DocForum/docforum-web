import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/render';
import { CommandPalette } from './CommandPalette';

const ACTIONS = [
  { id: 'open-queue', label: 'Open today\'s queue', category: 'navigation' as const, shortcut: 'mod+1', run: vi.fn() },
  { id: 'open-inbox', label: 'Open messages inbox', category: 'navigation' as const, shortcut: 'mod+2', run: vi.fn() },
  { id: 'start-consultation', label: 'Start consultation', category: 'context' as const, shortcut: 'mod+3', run: vi.fn() },
  { id: 'sign-note', label: 'Sign note', category: 'context' as const, run: vi.fn() },
];

function renderPalette(open = true) {
  return render(<CommandPalette actions={ACTIONS} open={open} onClose={vi.fn()} />);
}

describe('CommandPalette', () => {
  it('is hidden when closed', () => {
    renderPalette(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists all actions when no query', () => {
    renderPalette();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Open today\'s queue')).toBeInTheDocument();
    expect(screen.getByText('Sign note')).toBeInTheDocument();
  });

  it('filters actions by search query', async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = screen.getByRole('combobox');
    await user.type(input, 'inbox');
    expect(screen.getByText('Open messages inbox')).toBeInTheDocument();
    expect(screen.queryByText('Open today\'s queue')).not.toBeInTheDocument();
  });

  it('activates the focused action on Enter', async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = screen.getByRole('combobox');
    input.focus();
    await user.keyboard('{ArrowDown}');
    const option = document.getElementById('command-palette-option-0');
    expect(option?.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Enter}');
    expect(ACTIONS[0].run).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<CommandPalette actions={ACTIONS} open onClose={onClose} />);
    const input = screen.getByRole('combobox');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });
});
