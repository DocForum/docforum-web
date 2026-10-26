import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { ReferralInbox } from './ReferralInbox';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as referralsService from '../../../services/referrals-service';
import type { CursorPage, ReferralStatus, ReferralSummary } from '../../../types/models';

// Referrals carry their own frozen snapshot (issue #41), so this feature
// talks to exactly one service — there is no consultation/notes service to
// mock here, deliberately.
vi.mock('../../../services/referrals-service');

const LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  expired: 'Expired',
};

function makeSummary(id: string, overrides: Partial<ReferralSummary> = {}): ReferralSummary {
  return {
    id,
    status: 'pending',
    snapshotNotes: `Notes for ${id}`,
    referringDoctor: { id: 'doc-1', fullName: 'Dr. Amara Okafor' },
    snapshotTakenAt: '2026-09-30T08:15:00.000Z',
    createdAt: '2026-09-30T08:15:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...overrides,
  };
}

function makePage(items: ReferralSummary[], nextCursor: string | null): CursorPage<ReferralSummary> {
  return { items, nextCursor };
}

describe('ReferralInbox', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listReferrals).mockReset();
  });

  it('renders every status with its label, the snapshot date, and honest action copy', async () => {
    const statuses: ReferralStatus[] = ['pending', 'accepted', 'declined', 'completed', 'expired'];
    vi.mocked(referralsService.listReferrals).mockResolvedValue(
      makePage(
        statuses.map((status, index) => makeSummary(`ref-${index + 1}`, { status })),
        null,
      ),
    );

    const { container } = render(<ReferralInbox />);

    for (const index of statuses.keys()) {
      expect(await screen.findByText(`Notes for ref-${index + 1}`)).toBeInTheDocument();
    }
    statuses.forEach((status) => {
      const pill = container.querySelector(`[data-status="${status}"]`);
      expect(pill?.textContent).toBe(LABELS[status]);
    });
    expect(screen.getAllByText(/snapshot taken/i)).toHaveLength(statuses.length);
    // Accepting is the patient-side screen (#4); the specialist inbox never
    // pretends to accept — pending says "respond", everything else just opens.
    expect(screen.getByRole('link', { name: 'Respond to referral' })).toHaveAttribute(
      'href',
      '/doctor/referrals/ref-1',
    );
    expect(screen.getAllByRole('link', { name: 'Open referral' })).toHaveLength(statuses.length - 1);
  });

  it('links the resulting appointment only when one is scheduled', async () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue(
      makePage(
        [
          makeSummary('ref-live', {
            status: 'accepted',
            resultingAppointmentId: 'appt-9',
            appointment: { id: 'appt-9', status: 'scheduled' },
          }),
          makeSummary('ref-pending'),
        ],
        null,
      ),
    );

    render(<ReferralInbox />);
    await screen.findByText('Notes for ref-live');

    expect(screen.getByRole('link', { name: 'Upcoming appointment' })).toHaveAttribute(
      'href',
      '/doctor/appointments/appt-9',
    );
    expect(screen.queryAllByRole('link', { name: /appointment/i })).toHaveLength(1);
  });

  it('shows a loading state while the first page is in flight', () => {
    vi.mocked(referralsService.listReferrals).mockReturnValue(new Promise<CursorPage<ReferralSummary>>(() => {}));

    render(<ReferralInbox />);

    expect(screen.getByText(/loading referrals/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no referrals', async () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue(makePage([], null));

    render(<ReferralInbox />);

    expect(await screen.findByText(/no referrals yet/i)).toBeInTheDocument();
  });

  it('switching tabs refetches through the referrals service with the status filter', async () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue(makePage([], null));
    const user = userEvent.setup();

    render(<ReferralInbox />);
    await screen.findByText(/no referrals yet/i);

    await user.click(screen.getByRole('tab', { name: 'Pending' }));

    await waitFor(() =>
      expect(referralsService.listReferrals).toHaveBeenCalledWith({ status: 'pending', cursor: null, limit: 20 }, 'test-token'),
    );
    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between tabs with arrow keys', async () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue(makePage([], null));
    const user = userEvent.setup();

    render(<ReferralInbox />);
    await screen.findByText(/no referrals yet/i);

    await user.click(screen.getByRole('tab', { name: 'All' }));
    await user.keyboard('{ArrowRight}');

    const pending = screen.getByRole('tab', { name: 'Pending' });
    expect(pending).toHaveAttribute('aria-selected', 'true');
    expect(pending).toHaveFocus();
  });

  it('shows an error with a retry when the first page fails', async () => {
    vi.mocked(referralsService.listReferrals).mockRejectedValue(new ApiError('Referral service unavailable.', 503));

    render(<ReferralInbox />);

    expect(await screen.findByText(/referral service unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('appends page two on "Load more" and hides the button once the cursor runs out', async () => {
    vi.mocked(referralsService.listReferrals).mockImplementation(({ cursor }) =>
      Promise.resolve(
        cursor ? makePage([makeSummary('ref-3')], null) : makePage([makeSummary('ref-1'), makeSummary('ref-2')], 'cursor-1'),
      ),
    );
    const user = userEvent.setup();

    render(<ReferralInbox />);
    await screen.findByText('Notes for ref-1');
    expect(screen.queryByText('Notes for ref-3')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more referrals/i }));

    expect(await screen.findByText('Notes for ref-3'));
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('keeps the loaded pages visible when a later page fails', async () => {
    vi.mocked(referralsService.listReferrals)
      .mockImplementationOnce(() => Promise.resolve(makePage([makeSummary('ref-1')], 'cursor-1')))
      .mockImplementationOnce(() => Promise.reject(new ApiError('Page two exploded.', 500)));
    const user = userEvent.setup();

    render(<ReferralInbox />);
    await screen.findByText('Notes for ref-1');

    await user.click(screen.getByRole('button', { name: /load more referrals/i }));

    expect(await screen.findByText(/still loaded/i)).toBeInTheDocument();
    expect(screen.getByText('Notes for ref-1')).toBeInTheDocument();
  });
});
