import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from '../test/render';
import { Dialog } from './Dialog';

/**
 * The harness mirrors how callers use `Dialog`: a trigger button that opens it
 * and a controlled `open` flag, so focus restoration has a real trigger to
 * return to.
 */
function Triggered({
  children,
  onClose,
  describedBy,
  heading = 'Confirm the dispense',
}: {
  children: ReactNode;
  onClose?: () => void;
  describedBy?: string;
  heading?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <p id="extra-copy">Choose dispense quantity.</p>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        labelledBy="dialog-heading"
        describedBy={describedBy}
      >
        <h2 id="dialog-heading">{heading}</h2>
        {children}
      </Dialog>
    </>
  );
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog');
}

describe('Dialog (#290)', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog open={false} onClose={() => undefined} labelledBy="t">
        <h2 id="t">Hidden</h2>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('names the dialog with its heading and marks it modal', () => {
    render(
      <Triggered>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(dialog()).toHaveAccessibleName('Confirm the dispense');
    expect(dialog()).toHaveAttribute('aria-labelledby', 'dialog-heading');
  });

  it('wires an optional description id', () => {
    render(
      <Triggered describedBy="extra-copy">
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(dialog()).toHaveAttribute('aria-describedby', 'extra-copy');
    expect(dialog()).toHaveAccessibleDescription('Choose dispense quantity.');
  });

  it('leaves aria-describedby absent when no description is given', () => {
    render(
      <Triggered>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(dialog()).not.toHaveAttribute('aria-describedby');
  });

  it('moves focus to the first control when it opens', () => {
    render(
      <Triggered>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('focuses the panel itself when the dialog has no controls', () => {
    render(
      <Triggered>
        <p>Nothing to operate here.</p>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(dialog()).toHaveFocus();
    expect(screen.getByText('Nothing to operate here.')).toBeInTheDocument();
  });

  it('wraps Tab from the last control to the first', async () => {
    render(
      <Triggered>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    screen.getByRole('button', { name: 'Last' }).focus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first control to the last', async () => {
    render(
      <Triggered>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('skips disabled, hidden and aria-hidden controls', async () => {
    render(
      <Triggered>
        <button type="button" disabled>
          Disabled
        </button>
        <input type="hidden" />
        <button type="button" aria-hidden="true" tabIndex={0}>
          Hidden from AT
        </button>
        <button type="button">Reachable</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(screen.getByRole('button', { name: 'Reachable' })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Reachable' })).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Triggered onClose={onClose}>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is pressed with the primary button', () => {
    const onClose = vi.fn();
    render(
      <Triggered onClose={onClose}>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    fireEvent.mouseDown(dialog().parentElement as HTMLElement, { button: 0 });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the dialog open for a non-primary press on the backdrop', () => {
    // A right-click on the backdrop is a request for the context menu, not a
    // dismissal; the form inside would otherwise vanish mid-entry.
    const onClose = vi.fn();
    render(
      <Triggered onClose={onClose}>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    fireEvent.mouseDown(dialog().parentElement as HTMLElement, { button: 2 });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ignores a press that starts inside the panel', () => {
    const onClose = vi.fn();
    render(
      <Triggered onClose={onClose}>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    fireEvent.mouseDown(within(dialog()).getByRole('button', { name: 'Dispense' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('returns focus to the trigger when the dialog closes', () => {
    render(
      <Triggered>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(dialog()).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(trigger).toHaveFocus();
  });

  it('has no detectable axe violations', async () => {
    const { container } = render(
      <Triggered>
        <button type="button">Dispense</button>
      </Triggered>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
