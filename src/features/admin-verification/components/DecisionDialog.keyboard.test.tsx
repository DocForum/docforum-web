import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/render';
import { DecisionDialog } from './DecisionDialog';
import { useDecideVerification } from '../hooks/useVerifications';
import type { VerificationDetail } from '../../../types/models';

vi.mock('../hooks/useVerifications');

const DETAIL: VerificationDetail = {
  profile: {
    id: 'doc-1',
    fullName: 'Dr. Ficticia Example',
    email: null,
    verificationStatus: 'pending',
    specialties: ['Cardiology'],
    submittedAt: '2026-10-10T09:00:00.000Z',
    createdAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-10-10T09:00:00.000Z',
  },
  documents: [],
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Approve
      </button>
      {open && (
        <DecisionDialog
          detail={DETAIL}
          status="verified"
          onClose={() => setOpen(false)}
          onDecided={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe('DecisionDialog keyboard interaction (#247)', () => {
  beforeEach(() => {
    vi.mocked(useDecideVerification).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    } as never);
  });

  it('moves focus into the dialog and keeps Tab inside it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    screen.getByRole('button', { name: 'Approve' }).focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 3; i += 1) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const opener = screen.getByRole('button', { name: 'Approve' });
    await user.click(opener);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
