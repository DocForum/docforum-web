import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { FollowUpList } from './FollowUpList';
import { useAuthStore } from '../../../store/auth-store';
import type { FollowUpRequest, AvailabilitySlot, PatientAppointment } from '../../../types/models';
import * as followupService from '../../../services/followup-service';
import * as bookingService from '../../../services/booking-service';

vi.mock('../../../services/followup-service');
vi.mock('../../../services/booking-service');

const MOCK_OPEN_REQUEST: FollowUpRequest = {
  id: 'fur-1',
  doctorId: 'doc-1',
  doctorName: 'Dr. House',
  doctorSpecialty: 'Internal Medicine',
  note: 'Check liver function after 2 weeks',
  suggestedWindowStart: '2026-10-20T00:00:00Z',
  suggestedWindowEnd: '2026-11-05T00:00:00Z',
  status: 'open',
  sourceConsultationId: 'cst-101',
  createdAt: '2026-10-10T00:00:00Z',
};

const MOCK_EXPIRED_REQUEST: FollowUpRequest = {
  id: 'fur-2',
  doctorId: 'doc-1',
  doctorName: 'Dr. House',
  doctorSpecialty: 'Internal Medicine',
  note: 'Follow-up on skin rash',
  suggestedWindowStart: '2026-08-01T00:00:00Z',
  suggestedWindowEnd: '2026-08-15T00:00:00Z',
  status: 'expired',
  sourceConsultationId: 'cst-090',
  createdAt: '2026-07-15T00:00:00Z',
};

const MOCK_SLOT: AvailabilitySlot = {
  id: 'slt-fu-1',
  doctorProfileId: 'doc-1',
  status: 'open',
  startTime: '2026-10-25T10:00:00.000Z',
  endTime: '2026-10-25T10:30:00.000Z',
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
};

const MOCK_APPOINTMENT: PatientAppointment = {
  id: 'apt-fu-1',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-1',
  doctorName: 'Dr. House',
  doctorSpecialty: 'Internal Medicine',
  availabilitySlotId: 'slt-fu-1',
  status: 'scheduled',
  origin: 'direct_booking',
  availabilitySlot: MOCK_SLOT,
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
};

describe('FollowUpList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(followupService.listMyFollowUpRequests).mockReset();
    vi.mocked(followupService.bookFollowUp).mockReset();
    vi.mocked(bookingService.listDoctorSlots).mockReset();
  });

  it('renders open follow-up requests with doctor note and carried-over intake notice', async () => {
    vi.mocked(followupService.listMyFollowUpRequests).mockResolvedValue([MOCK_OPEN_REQUEST]);

    render(<FollowUpList />);

    expect(await screen.findByText('Dr. House')).toBeInTheDocument();
    expect(screen.getByText(/Check liver function after 2 weeks/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Intake is automatically carried over from your previous consultation/i)
    ).toBeInTheDocument();
  });

  it('opens slot picker and books follow-up', async () => {
    vi.mocked(followupService.listMyFollowUpRequests).mockResolvedValue([MOCK_OPEN_REQUEST]);
    vi.mocked(bookingService.listDoctorSlots).mockResolvedValue([MOCK_SLOT]);
    vi.mocked(followupService.bookFollowUp).mockResolvedValue(MOCK_APPOINTMENT);

    const user = userEvent.setup();
    render(<FollowUpList />);

    const bookButton = await screen.findByRole('button', { name: /Book Follow-up/i });
    await user.click(bookButton);

    const slotButton = await screen.findByRole('button', { name: /10:00 AM/i });
    await user.click(slotButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Follow-up Booking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(followupService.bookFollowUp).toHaveBeenCalledWith(
        { followUpRequestId: 'fur-1', slotId: 'slt-fu-1' },
        'test-token'
      );
    });

    expect(await screen.findByText(/Follow-up Booked Successfully!/i)).toBeInTheDocument();
  });

  it('renders expired follow-ups section', async () => {
    vi.mocked(followupService.listMyFollowUpRequests).mockResolvedValue([
      MOCK_OPEN_REQUEST,
      MOCK_EXPIRED_REQUEST,
    ]);

    render(<FollowUpList />);

    expect(await screen.findByText(/Expired Follow-up Requests/i)).toBeInTheDocument();
    expect(screen.getByText(/Expired Window/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up on skin rash/i)).toBeInTheDocument();
  });

  it('shows empty state when no open requests exist', async () => {
    vi.mocked(followupService.listMyFollowUpRequests).mockResolvedValue([]);

    render(<FollowUpList />);

    expect(await screen.findByText(/You have no open follow-up requests/i)).toBeInTheDocument();
  });
});
