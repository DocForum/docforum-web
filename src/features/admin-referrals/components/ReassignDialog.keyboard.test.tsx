import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/render';
import { makeStuckReferral } from '../../../test/factories';
import { ReassignDialog } from './ReassignDialog';
import { useReassignCandidates, useReassignReferral } from '../hooks/useStuckReferrals';
import type { DoctorAvailability } from '../../../types/models';

vi.mock('../hooks/useStuckReferrals');

const REFERRAL = makeStuckReferral();
const DOCTOR: DoctorAvailability = {
  id: 'doc-candidate',
  fullName: 'Dr. Candidate Example',
  verificationStatus: 'verified',
  specialties: [{ id: 'spec-cardiology', name: 'Cardiology', slug: 'cardiology' }],
  openSlotCount: 2,
  nextAvailableAt: '2026-10-22T09:00:00.000Z',
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reassign
      </button>
      {open && (
        <ReassignDialog
          referral={REFERRAL}
          onClose={() => setOpen(false)}
          onReassigned={() => setOpen(false)}
          onConflict={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe('ReassignDialog keyboard interaction (#247)', () => {
  beforeEach(() => {
    vi.mocked(useReassignCandidates).mockReturnValue({
      data: [DOCTOR],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useReassignReferral).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    } as never);
  });

  it('moves focus into the dialog and keeps Tab inside it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    screen.getByRole('button', { name: 'Reassign' }).focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog', { name: 'Reassign referral' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    for (let i = 0; i < 10; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const opener = screen.getByRole('button', { name: 'Reassign' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
