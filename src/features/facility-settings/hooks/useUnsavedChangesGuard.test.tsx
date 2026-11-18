import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

function GuardHarness() {
  const [dirty, setDirty] = useState(true);
  useUnsavedChangesGuard(dirty);
  return (
    <div>
      <button type="button" onClick={() => setDirty(false)}>
        Mark clean
      </button>
      <a href="#/facility/team">Leave settings</a>
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
  it('asks for confirmation before an in-app link leaves unsaved settings', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/unsaved facility settings/i),
    );
  });

  it('does not prompt once the editor is clean', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('button', { name: /mark clean/i }));
    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    expect(confirm).not.toHaveBeenCalled();
  });
});
