import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/render';
import { makeFeatureFlag } from '../../../test/factories';
import { FlagChangeDialog } from './FlagChangeDialog';
import type { FeatureFlag } from '../../../types/models';

const FLAG: FeatureFlag = makeFeatureFlag({
  key: 'wallet_payments',
  kind: 'percentage',
  enabled: true,
  rolloutPercentage: 25,
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Edit flag
      </button>
      {open && (
        <FlagChangeDialog
          flag={FLAG}
          liveFlag={FLAG}
          lastChange={{ status: 'none' }}
          now={Date.parse('2026-10-21T12:00:00.000Z')}
          onClose={() => setOpen(false)}
          onConfirm={vi.fn()}
        />
      )}
    </>
  );
}

describe('FlagChangeDialog keyboard interaction (#247)', () => {
  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    screen.getByRole('button', { name: 'Edit flag' }).focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog', { name: /Edit wallet_payments/ });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('wraps Tab focus instead of escaping the modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Edit flag' }));
    const dialog = screen.getByRole('dialog', { name: /Edit wallet_payments/ });

    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const opener = screen.getByRole('button', { name: 'Edit flag' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
