import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../services/api-client';
import { renderWithProviders } from '../../../test/render';
import type { AvailabilitySlot, FollowUpRequest } from '../../../types/models';
import { followUpKeys } from '../../../query-keys';
import { FollowUpRequests } from './FollowUpRequests';
import * as appointmentsService from '../../../services/appointments-service';
import * as followUpsService from '../../../services/follow-ups-service';

vi.mock('../../../services/follow-ups-service', () => ({
  listMyFollowUps: vi.fn(),
  bookFollowUp: vi.fn(),
}));

vi.mock('../../../services/appointments-service', async (importOriginal) => ({
  ...(await importOriginal<typeof appointmentsService>()),
  getOpenSlots: vi.fn(),
}));

const now = Date.now();
const request: FollowUpRequest = {
  id: 'follow-up-1',
  consultationId: 'consultation-1',
  doctorProfileId: 'doctor-1',
  patientProfileId: 'patient-1',
  notesSnapshot: 'Please return to review the treatment.',
  intakeFormId: 'intake-1',
  windowStart: new Date(now + 60 * 60 * 1000).toISOString(),
  windowEnd: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'open',
  bookedAppointmentId: null,
  createdAt: new Date(now).toISOString(),
};

const slot: AvailabilitySlot = {
  id: 'slot-1',
  doctorProfileId: request.doctorProfileId,
  status: 'open',
  startTime: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(now + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};

const expiredRequest: FollowUpRequest = {
  ...request,
  id: 'follow-up-expired',
  status: 'expired',
  windowStart: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
  windowEnd: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

describe('FollowUpRequests', () => {
  beforeEach(() => {
    vi.mocked(followUpsService.listMyFollowUps).mockReset();
    vi.mocked(followUpsService.bookFollowUp).mockReset();
    vi.mocked(appointmentsService.getOpenSlots).mockReset();
  });

  it('shows the request note and window, books a doctor slot without another intake step', async () => {
    vi.mocked(followUpsService.listMyFollowUps).mockResolvedValue([request]);
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([
      slot,
      { ...slot, id: 'slot-other-doctor', doctorProfileId: 'doctor-2' },
      {
        ...slot,
        id: 'slot-outside-window',
        startTime: new Date(Date.parse(request.windowEnd) + 60_000).toISOString(),
        endTime: new Date(Date.parse(request.windowEnd) + 31 * 60_000).toISOString(),
      },
    ]);
    vi.mocked(followUpsService.bookFollowUp).mockResolvedValue({
      appointment: {
        id: 'appointment-1',
        patientProfileId: request.patientProfileId,
        doctorProfileId: request.doctorProfileId,
        availabilitySlotId: slot.id,
        status: 'scheduled',
        origin: 'follow_up',
        availabilitySlot: { ...slot, status: 'booked' },
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      followUp: { ...request, status: 'booked', bookedAppointmentId: 'appointment-1' },
    });

    renderWithProviders(<FollowUpRequests />, { role: 'patient' });
    expect(await screen.findByText(request.notesSnapshot!)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Book follow-up' }));
    expect(await screen.findAllByRole('button', { name: / – / })).toHaveLength(1);
    await user.click(await screen.findByRole('button', { name: /, .* – .*/ }));
    expect(screen.getByText(/No new intake form is needed/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm follow-up booking' }));

    await waitFor(() => {
      expect(followUpsService.bookFollowUp).toHaveBeenCalledWith(
        request.id,
        slot.id,
        'test-patient-token',
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Your previous intake is carried over/);
  });

  it('shows expired follow-ups with a rebooking action and renders an empty state', async () => {
    vi.mocked(followUpsService.listMyFollowUps).mockResolvedValue([expiredRequest]);
    const rendered = renderWithProviders(<FollowUpRequests />, { role: 'patient' });
    expect(await screen.findByRole('heading', { name: 'Expired follow-ups' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find another appointment' })).toHaveAttribute('href', '/patient/search');

    vi.mocked(followUpsService.listMyFollowUps).mockResolvedValue([]);
    rendered.queryClient.setQueryData(followUpKeys.mine(), []);
    expect(await screen.findByText('Follow-up requests from your doctor will appear here.')).toBeInTheDocument();
  });

  it('explains a booking conflict and invites the patient to choose another time', async () => {
    vi.mocked(followUpsService.listMyFollowUps).mockResolvedValue([request]);
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([slot]);
    vi.mocked(followUpsService.bookFollowUp).mockRejectedValue(new ApiError('taken', 409));
    renderWithProviders(<FollowUpRequests />, { role: 'patient' });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Book follow-up' }));
    await user.click(await screen.findByRole('button', { name: /, .* – .*/ }));
    await user.click(screen.getByRole('button', { name: 'Confirm follow-up booking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose another time/i);
  });
});
