import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from '../test/render';
import { DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { ShortcutsHelp } from './ShortcutsHelp';

// As `DoctorDashboardPage` passes them: the bound key for every action, with
// one rebind so the table can't be mistaken for the defaults.
const bindings: Record<string, string> = {
  'open-palette': 'mod+k',
  'open-help': 'mod+/',
  'next-patient': 'mod+j',
  'open-chart': 'mod+o',
  'sign-note': 'mod+shift+s',
};

function dialog(): HTMLElement {
  return screen.getByRole('dialog');
}

describe('ShortcutsHelp (#290)', () => {
  it('renders nothing while closed', () => {
    render(<ShortcutsHelp open={false} onClose={() => undefined} bindings={bindings} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every default shortcut with the key it is bound to', () => {
    render(<ShortcutsHelp open onClose={() => undefined} bindings={bindings} />);

    expect(screen.getAllByRole('row')).toHaveLength(DEFAULT_SHORTCUTS.length + 1);
    for (const binding of DEFAULT_SHORTCUTS) {
      const heading = screen.getByRole('rowheader', { name: binding.label });
      expect(within(heading.parentElement as HTMLTableRowElement).getByRole('cell')).toHaveTextContent(
        bindings[binding.action],
      );
    }
  });

  it('names the dialog and explains that shortcuts pause while typing', () => {
    render(<ShortcutsHelp open onClose={() => undefined} bindings={bindings} />);

    expect(dialog()).toHaveAccessibleName('Keyboard shortcuts');
    expect(dialog()).toHaveAccessibleDescription(
      'Shortcuts are disabled while typing in a field. Bindings can be adjusted to avoid clashing with assistive technology.',
    );
  });

  it('closes through the Close button', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp open onClose={onClose} bindings={bindings} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp open onClose={onClose} bindings={bindings} />);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has no detectable axe violations', async () => {
    const { container } = render(
      <ShortcutsHelp open onClose={() => undefined} bindings={bindings} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
