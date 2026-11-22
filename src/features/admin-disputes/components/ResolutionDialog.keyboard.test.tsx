import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/render';
import { makeDisputeSummary } from '../../../test/factories';
import { ResolutionDialog } from './ResolutionDialog';
import { useResolveDispute } from '../hooks/useDisputes';
import type { FulfillmentDispute } from '../../../types/models';

vi.mock('../hooks/useDisputes');

const DISPUTE: FulfillmentDispute = {
  ...makeDisputeSummary({ status: 'open' }),
  patientReport: {
    reason: 'not_received',
    description: 'It never arrived.',
    submittedAt: '2026-10-14T09:00:00.000Z',
    submittedBy: 'Pat Placeholder',
  },
  facilityProof: null,
  payment: { intentId: 'pin-1', status: 'escrowed', escrowId: 'esc-1' },
  timeline: [],
  resolvedAt: null,
  resolution: null,
  resolutionNotes: null,
  resolvedBy: null,
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Resolve dispute
      </button>
      {open && (
        <ResolutionDialog
          dispute={DISPUTE}
          resolution="facility"
          onClose={() => setOpen(false)}
          onResolved={() => setOpen(false)}
          onStale={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe('ResolutionDialog keyboard interaction (#247)', () => {
  beforeEach(() => {
    vi.mocked(useResolveDispute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    } as never);
  });

  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const opener = screen.getByRole('button', { name: 'Resolve dispute' });
    opener.focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Resolve dispute' }));
    const dialog = screen.getByRole('alertdialog');

    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 4; i += 1) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and returns focus to the button that opened it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const opener = screen.getByRole('button', { name: 'Resolve dispute' });
    await user.click(opener);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
