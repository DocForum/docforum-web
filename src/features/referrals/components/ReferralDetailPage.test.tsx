import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { ReferralDetailPage } from './ReferralDetailPage';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as referralsService from '../../../services/referrals-service';
import type { ReferralDetail } from '../../../types/models';

// The referral payload is self-contained by design (issue #41): this feature
// folder imports nothing but referrals-service, and the tests below assert
// that the detail path calls it and performs no other fetch — no live
// consultation-notes endpoint is involved.
vi.mock('../../../services/referrals-service');

const SNAPSHOT_TAKEN_AT = '2026-09-30T08:15:00.000Z';
const UPDATED_AT = '2026-10-02T10:00:00.000Z';
const SNAPSHOT_NOTES = 'Referred for palpitations \u2014 \u201curgent\u201d. ECG readings attached.';

function humanDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function makeDetail(overrides: Partial<ReferralDetail> = {}): ReferralDetail {
  return {
    id: 'ref-1',
    status: 'pending',
    snapshotNotes: SNAPSHOT_NOTES,
    referringDoctor: { id: 'doc-1', fullName: 'Dr. Amara Okafor' },
    targetSpecialty: { id: 'sp-1', name: 'Cardiology', slug: 'cardiology' },
    snapshotTakenAt: SNAPSHOT_TAKEN_AT,
    createdAt: SNAPSHOT_TAKEN_AT,
    updatedAt: UPDATED_AT,
    intakeSnapshot: {
      id: 'intake-1',
      symptoms: ['Palpitations', 'Shortness of breath'],
      submittedAt: '2026-09-28T17:40:00.000Z',
    },
    ...overrides,
  };
}

describe('ReferralDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.getReferralDetail).mockReset();
    vi.mocked(referralsService.listReferrals).mockReset();
  });

  it('renders the labelled snapshot from the referral payload and calls only the referrals service', async () => {
    vi.mocked(referralsService.getReferralDetail).mockResolvedValue(makeDetail());
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    render(<ReferralDetailPage referralId="ref-1" />);

    const label = await screen.findByText(/snapshot taken/i);
    expect(label.textContent).toBe(`Snapshot taken ${humanDate(SNAPSHOT_TAKEN_AT)}`);
    expect(screen.getByText(SNAPSHOT_NOTES)).toBeInTheDocument();
    expect(screen.getByText('Dr. Amara Okafor')).toBeInTheDocument();
    expect(referralsService.getReferralDetail).toHaveBeenCalledWith('ref-1', 'test-token');
    // Network-boundary proof of the review criterion: zero fetches outside
    // the (mocked) referrals service while the detail view loads and renders.
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('links a scheduled resulting appointment and shows its booked date', async () => {
    vi.mocked(referralsService.getReferralDetail).mockResolvedValue(
      makeDetail({
        status: 'accepted',
        resultingAppointmentId: 'appt-9',
        appointment: { id: 'appt-9', status: 'scheduled' },
      }),
    );
    const { container } = render(<ReferralDetailPage referralId="ref-1" />);

    await screen.findByText(/snapshot taken/i);
    expect(screen.getByRole('link', { name: 'View appointment' })).toHaveAttribute(
      'href',
      '/doctor/appointments/appt-9',
    );
    expect(screen.getByText(/^Scheduled/).textContent).toContain(humanDate(UPDATED_AT));
    expect(container.querySelector(`time[datetime="${UPDATED_AT}"]`)).not.toBeNull();
  });

  it('shows no appointment link for a pending referral without one', async () => {
    vi.mocked(referralsService.getReferralDetail).mockResolvedValue(makeDetail({ status: 'pending' }));

    render(<ReferralDetailPage referralId="ref-1" />);

    await screen.findByText(/snapshot taken/i);
    expect(screen.queryByRole('link', { name: /appointment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resulting appointment' })).not.toBeInTheDocument();
  });

  it('renders the access-denied state for a 403 (reassigned referral), leaking no snapshot data', async () => {
    vi.mocked(referralsService.getReferralDetail).mockRejectedValue(
      new ApiError('This referral was reassigned to another specialist.', 403),
    );

    render(<ReferralDetailPage referralId="ref-1" />);

    expect(await screen.findByText(/reassigned/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to referrals' })).toHaveAttribute('href', '/doctor/referrals');
    expect(screen.queryByText(SNAPSHOT_NOTES)).not.toBeInTheDocument();
  });

  it('renders the access-denied state for a 404 rather than a raw error string', async () => {
    vi.mocked(referralsService.getReferralDetail).mockRejectedValue(new ApiError('Not Found', 404));

    render(<ReferralDetailPage referralId="ref-1" />);

    expect(await screen.findByText(/find this referral/i)).toBeInTheDocument();
    expect(screen.queryByText('Not Found')).not.toBeInTheDocument();
  });

  it('shows a plain error state for other failures', async () => {
    vi.mocked(referralsService.getReferralDetail).mockRejectedValue(new ApiError('Upstream blew up.', 500));

    render(<ReferralDetailPage referralId="ref-1" />);

    expect(await screen.findByText(/upstream blew up/i)).toBeInTheDocument();
  });
});
