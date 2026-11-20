import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { Dialog } from '../../../components/Dialog';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

function GuardHarness() {
  const [dirty, setDirty] = useState(true);
  const [navigated, setNavigated] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

  return (
    <div>
      <button type="button" onClick={() => setDirty(false)}>
        Mark clean
      </button>
      <a href="#/facility/team" onClick={() => setNavigated(true)}>
        Leave settings
      </a>
      {navigated && <p>Navigated</p>}

      <Dialog
        open={guard.pendingHref !== null}
        onClose={guard.cancelLeave}
        labelledBy="unsaved-title"
        describedBy="unsaved-description"
      >
        <h3 id="unsaved-title">Discard unsaved changes?</h3>
        <p id="unsaved-description">Your unsaved facility settings will be lost.</p>
        <button type="button" onClick={guard.cancelLeave}>
          Keep editing
        </button>
        <button type="button" onClick={guard.confirmLeave}>
          Discard and leave
        </button>
      </Dialog>
    </div>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useUnsavedChangesGuard', () => {
  it('asks for confirmation in a dialog before an in-app link leaves unsaved settings', async () => {
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('link', { name: /leave settings/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Discard unsaved changes?');
    expect(dialog).toHaveAccessibleDescription(/unsaved facility settings/i);
    expect(screen.queryByText('Navigated')).not.toBeInTheDocument();
  });

  it('does not navigate when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /keep editing/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dialog).not.toBeInTheDocument();
    expect(screen.queryByText('Navigated')).not.toBeInTheDocument();
  });

  it('continues to the link when the user confirms discarding', async () => {
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /discard and leave/i }));

    expect(await screen.findByText('Navigated')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not prompt once the editor is clean', async () => {
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('button', { name: /mark clean/i }));
    await user.click(screen.getByRole('link', { name: /leave settings/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Navigated')).toBeInTheDocument();
  });
});
