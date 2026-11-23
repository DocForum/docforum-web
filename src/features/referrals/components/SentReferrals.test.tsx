import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import { SentReferrals } from './SentReferrals';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as referralsService from '../../../services/referrals-service';
import type { ReferralStatus, SentReferral } from '../../../types/models';

vi.mock('../../../services/referrals-service');

const NOW = Date.now();
const HOUR = 3_600_000;

function at(hoursAgo: number) {
  return new Date(NOW - hoursAgo * HOUR).toISOString();
}

function makeSent(id: string, overrides: Partial<SentReferral> = {}): SentReferral {
  return {
    id,
    status: 'pending',
    targetDoctorId: 'doc-target-1',
    targetSpecialtyId: 'spc-cardio',
    targetDoctor: { id: 'doc-target-1', fullName: 'Dr. Cora Sample (fake)' },
    targetSpecialty: { id: 'spc-cardio', name: 'Cardiology', slug: 'cardiology' },
    referringDoctorNotifiedAt: null,
    loopFlaggedAt: null,
    loopFlagReason: null,
    noShowCount: 0,
    expiredAt: null,
    expiredReason: null,
    resultingAppointmentId: null,
    createdAt: at(24),
    updatedAt: at(24),
    ...overrides,
  };
}

const LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

describe('SentReferrals', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listCreatedReferrals).mockReset();
  });

  it('renders every status with its target doctor and specialty', async () => {
    const statuses: ReferralStatus[] = ['pending', 'accepted', 'declined', 'completed', 'expired', 'cancelled'];
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue(
      statuses.map((status, index) =>
        makeSent(`ref-${status}`, {
          status,
          createdAt: at(index + 1),
          targetDoctor: { id: `doc-${index}`, fullName: `Dr. Target ${index} (fake)` },
        }),
      ),
    );

    const { container } = render(<SentReferrals />);

    expect(await screen.findByText('Dr. Target 0 (fake)')).toBeInTheDocument();
    expect(screen.getAllByText('Cardiology')).toHaveLength(statuses.length);
    statuses.forEach((status) => {
      const pill = container.querySelector(`[data-status="${status}"]`);
      expect(pill?.textContent).toBe(LABELS[status]);
    });
  });

  it('badges expired-and-notified and loop-flagged referrals, with the loop reason', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([
      makeSent('ref-expired', {
        status: 'expired',
        referringDoctorNotifiedAt: at(2),
        expiredAt: at(2),
        expiredReason: 'no_show',
        noShowCount: 2,
      }),
      makeSent('ref-loop', {
        loopFlaggedAt: at(4),
        loopFlagReason: 'Cardiology already appears earlier in this referral chain.',
      }),
      makeSent('ref-expired-ttl', {
        status: 'expired',
        expiredAt: at(10),
        expiredReason: 'ttl',
      }),
    ]);

    const { container } = render(<SentReferrals />);

    expect(await screen.findByText(/expired after no-shows/i)).toBeInTheDocument();
    expect(screen.getByText('Loop flagged')).toBeInTheDocument();
    expect(screen.getByText(/already appears earlier/i)).toBeInTheDocument();
    expect(screen.getByText(/2 missed appointments/i)).toBeInTheDocument();
    // A TTL expiry did not notify the referring doctor, so it earns no badge.
    expect(container.querySelectorAll('[data-badge="expired-notified"]')).toHaveLength(1);
  });

  it('puts the newest referrals needing attention first, then settled ones newest first', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([
      makeSent('ref-accepted-newest', {
        status: 'accepted',
        createdAt: at(1),
        targetDoctor: { id: 'doc-accepted', fullName: 'Dr. Accepted (fake)' },
      }),
      makeSent('ref-pending-older', {
        createdAt: at(50),
        targetDoctor: { id: 'doc-pending', fullName: 'Dr. Pending (fake)' },
      }),
      makeSent('ref-loop-oldest', {
        createdAt: at(80),
        loopFlaggedAt: at(80),
        targetDoctor: { id: 'doc-loop', fullName: 'Dr. Loop (fake)' },
      }),
      makeSent('ref-completed', {
        status: 'completed',
        createdAt: at(100),
        targetDoctor: { id: 'doc-completed', fullName: 'Dr. Completed (fake)' },
      }),
    ]);

    render(<SentReferrals />);

    await screen.findByText(/referrals need attention/i);
    const rows = screen.getAllByRole('listitem');
    const order = rows.map((row) => row.textContent ?? '');
    // Newest attention first: pending (50h) before loop (80h); both before
    // the newer but settled accepted row.
    expect(order[0]).toContain('Pending (fake)');
    expect(order[1]).toContain('Loop (fake)');
    expect(order[2]).toContain('Accepted (fake)');
    expect(order[3]).toContain('Completed (fake)');
  });

  it('links each row to the referral detail and marks the sent origin', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([makeSent('ref-detail')]);

    render(<SentReferrals />);

    expect(await screen.findByRole('link', { name: 'Open referral' })).toHaveAttribute(
      'href',
      '/doctor/referrals/ref-detail?from=sent',
    );
  });

  it('never renders snapshot notes', async () => {
    const withPhi = {
      ...makeSent('ref-phi'),
      snapshotNotes: 'Sensitive snapshot note that must stay out of the list.',
    } as SentReferral;
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([withPhi]);

    render(<SentReferrals />);

    await screen.findByRole('link', { name: 'Open referral' });
    expect(screen.queryByText(/Sensitive snapshot note/i)).not.toBeInTheDocument();
  });

  it('shows the empty state when the doctor has sent nothing', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([]);

    render(<SentReferrals />);

    expect(await screen.findByText(/haven't sent any referrals/i)).toBeInTheDocument();
  });

  it('shows a loading state while the endpoint is in flight', () => {
    vi.mocked(referralsService.listCreatedReferrals).mockReturnValue(new Promise<SentReferral[]>(() => {}));

    render(<SentReferrals />);

    expect(screen.getByText(/loading sent referrals/i)).toBeInTheDocument();
  });

  it('shows the server message and a retry when the request fails', async () => {
    vi.mocked(referralsService.listCreatedReferrals)
      .mockRejectedValueOnce(new ApiError('Referral service unavailable.', 503))
      .mockResolvedValueOnce([makeSent('ref-retry')]);

    render(<SentReferrals />);

    expect(await screen.findByText(/referral service unavailable/i)).toBeInTheDocument();
    screen.getByRole('button', { name: /try again/i }).click();

    await waitFor(() => expect(screen.getByText(/Cora Sample/)).toBeInTheDocument());
  });
});
