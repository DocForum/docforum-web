import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from '../test/render';
import { ConfirmDialog } from './ConfirmDialog';

type Props = ComponentProps<typeof ConfirmDialog>;

function renderConfirm(overrides: Partial<Props> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <ConfirmDialog
      title="Mark Ada Obi as a no-show?"
      description="Ada Obi's 09:00 appointment will be recorded as a no-show."
      confirmLabel="Mark as no-show"
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { ...result, onConfirm, onClose };
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog');
}

function confirmButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Mark as no-show' });
}

function cancelButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Go back' });
}

function pressBackdrop(): void {
  fireEvent.mouseDown(dialog().parentElement as HTMLElement, { button: 0 });
}

function pressEscape(): void {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
}

describe('ConfirmDialog (#290)', () => {
  it('renders the title, description and both actions', () => {
    renderConfirm();

    expect(dialog()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mark Ada Obi as a no-show?' })).toBeInTheDocument();
    expect(
      screen.getByText("Ada Obi's 09:00 appointment will be recorded as a no-show."),
    ).toBeInTheDocument();
    expect(confirmButton()).toBeInTheDocument();
    expect(cancelButton()).toBeInTheDocument();
  });

  it('names the dialog after its title and describes it with the description', () => {
    renderConfirm();

    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(dialog()).toHaveAccessibleName('Mark Ada Obi as a no-show?');
    expect(dialog()).toHaveAccessibleDescription(
      "Ada Obi's 09:00 appointment will be recorded as a no-show.",
    );
  });

  it('lets the caller replace the cancel label', () => {
    renderConfirm({ cancelLabel: 'Keep visit' });

    expect(screen.getByRole('button', { name: 'Keep visit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument();
  });

  it('renders extra content the caller passes inside the dialog', () => {
    renderConfirm({ children: <p>The orthopaedic referral goes back to pending.</p> });

    expect(within(dialog()).getByText('The orthopaedic referral goes back to pending.')).toBeInTheDocument();
  });

  it('announces a failed request as an alert', () => {
    renderConfirm({ error: 'Could not mark this visit as a no-show. Try again.' });

    expect(within(dialog()).getByRole('alert')).toHaveTextContent(
      'Could not mark this visit as a no-show. Try again.',
    );
  });

  it('shows no alert region while nothing has failed', () => {
    renderConfirm();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('routes the action buttons to the confirm and cancel callbacks', async () => {
    const { onConfirm, onClose } = renderConfirm({ confirmVariant: 'danger' });

    await userEvent.click(confirmButton());
    await userEvent.click(cancelButton());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape and on a primary press of the backdrop', () => {
    const { onClose } = renderConfirm();

    pressEscape();
    pressBackdrop();

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('holds the dialog open while a request is in flight', () => {
    const { onClose } = renderConfirm({ busy: true, confirmVariant: 'danger' });

    pressEscape();
    pressBackdrop();

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog()).toBeInTheDocument();
  });

  it('disables both actions and marks the confirm busy while a request is in flight', () => {
    renderConfirm({ busy: true });

    expect(cancelButton()).toBeDisabled();
    expect(confirmButton()).toBeDisabled();
    expect(confirmButton()).toHaveAttribute('aria-busy', 'true');
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderConfirm({
      children: <p>The orthopaedic referral goes back to pending.</p>,
      error: 'Could not mark this visit as a no-show.',
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
