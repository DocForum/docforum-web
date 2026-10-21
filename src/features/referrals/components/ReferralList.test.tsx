import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { ReferralList } from './ReferralList';
import { useAuthStore } from '../../../store/auth-store';
import type { PendingReferral, PatientAppointment } from '../../../types/models';
import * as referralService from '../../../services/referral-service';

vi.mock('../../../services/referral-service');

const MOCK_REFERRAL: PendingReferral = {
  id: 'ref-1',
  sourceConsultationId: 'cst-1',
  referringDoctorName: 'Dr. Primary Care',
  targetSpecialty: 'Neurology',
  reason: 'Frequent migraines with aura',
  status: 'pending',
  createdAt: '2026-10-15T00:00:00Z',
};

const MOCK_APPOINTMENT: PatientAppointment = {
  id: 'apt-created-1',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-spec-1',
  doctorName: 'Dr. Primary Care',
  doctorSpecialty: 'Neurology',
  availabilitySlotId: 'slt-auto-1',
  status: 'scheduled',
  origin: 'referral',
  availabilitySlot: {
    id: 'slt-auto-1',
    doctorProfileId: 'doc-spec-1',
    status: 'booked',
    startTime: '2026-11-01T10:00:00.000Z',
    endTime: '2026-11-01T10:30:00.000Z',
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
  createdAt: '2026-10-15T00:00:00Z',
  updatedAt: '2026-10-15T00:00:00Z',
};

describe('ReferralList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralService.listPendingReferrals).mockReset();
    vi.mocked(referralService.acceptReferral).mockReset();
    vi.mocked(referralService.declineReferral).mockReset();
  });

  it('renders pending referrals', async () => {
    vi.mocked(referralService.listPendingReferrals).mockResolvedValue([MOCK_REFERRAL]);

    render(<ReferralList />);

    expect(await screen.findByText(/Referred by Dr. Primary Care/i)).toBeInTheDocument();
    expect(screen.getByText('Neurology')).toBeInTheDocument();
    expect(screen.getByText(/Frequent migraines with aura/i)).toBeInTheDocument();
  });

  it('accepts a referral and confirms auto-created appointment without re-entering intake', async () => {
    vi.mocked(referralService.listPendingReferrals).mockResolvedValue([MOCK_REFERRAL]);
    vi.mocked(referralService.acceptReferral).mockResolvedValue({
      referralId: 'ref-1',
      createdAppointment: MOCK_APPOINTMENT,
    });

    const user = userEvent.setup();
    render(<ReferralList />);

    const acceptButton = await screen.findByRole('button', { name: /Accept Referral & Book/i });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(referralService.acceptReferral).toHaveBeenCalledWith('ref-1', 'test-token');
    });

    expect(await screen.findByText(/Referral Accepted & Appointment Created!/i)).toBeInTheDocument();
    expect(screen.getByText(/No need to re-enter intake information/i)).toBeInTheDocument();
  });

  it('declines a referral', async () => {
    vi.mocked(referralService.listPendingReferrals).mockResolvedValue([MOCK_REFERRAL]);
    vi.mocked(referralService.declineReferral).mockResolvedValue({
      success: true,
      referralId: 'ref-1',
    });

    const user = userEvent.setup();
    render(<ReferralList />);

    const declineButton = await screen.findByRole('button', { name: /Decline/i });
    await user.click(declineButton);

    await waitFor(() => {
      expect(referralService.declineReferral).toHaveBeenCalledWith('ref-1', 'test-token');
    });
  });

  it('shows empty state when no pending referrals exist', async () => {
    vi.mocked(referralService.listPendingReferrals).mockResolvedValue([]);

    render(<ReferralList />);

    expect(
      await screen.findByText(/You have no pending specialist referrals at this time/i)
    ).toBeInTheDocument();
  });
});
