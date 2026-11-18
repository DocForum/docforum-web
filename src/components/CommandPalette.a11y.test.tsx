import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../test/render';
import { CommandPalette, type CommandPaletteAction } from './CommandPalette';

const ACTIONS: CommandPaletteAction[] = [
  { id: 'queue', label: "Open today's queue", category: 'navigation', run: vi.fn() },
  { id: 'inbox', label: 'Open messages inbox', category: 'navigation', run: vi.fn() },
];

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette actions={ACTIONS} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('CommandPalette accessibility (#90)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /open palette/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('labels the combobox and exposes it as an expanded listbox control', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /open palette/i }));

    const input = screen.getByRole('combobox', { name: /search commands and patients/i });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /open palette/i });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
