import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';

function renderWarning(overrides: Partial<Parameters<typeof SessionTimeoutWarning>[0]> = {}) {
  const onStaySignedIn = vi.fn();
  const onSignOutNow = vi.fn();
  render(
    <SessionTimeoutWarning
      open
      secondsRemaining={45}
      unsavedChanges={false}
      onStaySignedIn={onStaySignedIn}
      onSignOutNow={onSignOutNow}
      {...overrides}
    />,
  );
  return { onStaySignedIn, onSignOutNow };
}

describe('SessionTimeoutWarning', () => {
  it('renders nothing while closed', () => {
    renderWarning({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the countdown, focuses "Stay signed in", and extends the session', async () => {
    const user = userEvent.setup();
    const { onStaySignedIn } = renderWarning({ secondsRemaining: 42 });

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/42 seconds/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stay signed in/i })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /stay signed in/i }));
    expect(onStaySignedIn).toHaveBeenCalledTimes(1);
  });

  it('offers an immediate sign out', async () => {
    const user = userEvent.setup();
    const { onSignOutNow } = renderWarning();

    await user.click(screen.getByRole('button', { name: /sign out now/i }));
    expect(onSignOutNow).toHaveBeenCalledTimes(1);
  });

  it('warns when a form holds unsaved changes', () => {
    renderWarning({ unsavedChanges: true });
    expect(screen.getByRole('status')).toHaveTextContent(/unsaved changes/i);
  });

  it('stays quiet about unsaved changes when there are none', () => {
    renderWarning({ unsavedChanges: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
