import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { BookingForm } from './BookingForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import type { AvailabilitySlot, PatientAppointment } from '../../../types/models';
import * as bookingService from '../../../services/booking-service';

vi.mock('../../../services/booking-service');

const MOCK_SLOT: AvailabilitySlot = {
  id: 'slt-1',
  doctorProfileId: 'doc-1',
  status: 'open',
  startTime: '2026-10-25T10:00:00.000Z',
  endTime: '2026-10-25T10:30:00.000Z',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const MOCK_APPOINTMENT: PatientAppointment = {
  id: 'apt-1',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-1',
  doctorName: 'Dr. Smith',
  doctorSpecialty: 'General Practice',
  availabilitySlotId: 'slt-1',
  status: 'scheduled',
  origin: 'direct_booking',
  availabilitySlot: MOCK_SLOT,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('BookingForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(bookingService.listDoctorSlots).mockReset();
    vi.mocked(bookingService.createBooking).mockReset();
  });

  it('renders slots and submits structured intake', async () => {
    vi.mocked(bookingService.listDoctorSlots).mockResolvedValue([MOCK_SLOT]);
    vi.mocked(bookingService.createBooking).mockResolvedValue(MOCK_APPOINTMENT);

    const user = userEvent.setup();
    render(<BookingForm doctorId="doc-1" doctorName="Dr. Smith" />);

    expect(await screen.findByText(/Book Consultation with Dr. Smith/i)).toBeInTheDocument();

    // Select slot
    const slotButton = await screen.findByRole('button', { name: /10:00 AM/i });
    await user.click(slotButton);

    // Fill intake
    await user.type(screen.getByLabelText(/Primary Symptom or Reason for Visit/i), 'Persistent cough');
    await user.type(screen.getByLabelText(/Symptom Duration/i), '4 days');
    await user.type(screen.getByLabelText(/Current Medications/i), 'Vitamin C');
    await user.type(screen.getByLabelText(/Allergies/i), 'None');

    // Submit
    await user.click(screen.getByRole('button', { name: /Confirm & Book Appointment/i }));

    await waitFor(() => {
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        {
          slotId: 'slt-1',
          intake: {
            chiefComplaint: 'Persistent cough',
            symptomDuration: '4 days',
            severity: 5,
            currentMedications: ['Vitamin C'],
            allergies: ['None'],
          },
        },
        'test-token'
      );
    });

    expect(await screen.findByText(/Appointment Confirmed!/i)).toBeInTheDocument();
  });

  it('handles 409 double-booking gracefully with a specific error message', async () => {
    vi.mocked(bookingService.listDoctorSlots).mockResolvedValue([MOCK_SLOT]);
    vi.mocked(bookingService.createBooking).mockRejectedValue(
      new ApiError('Slot taken', 409, { message: 'Slot taken' })
    );

    const user = userEvent.setup();
    render(<BookingForm doctorId="doc-1" doctorName="Dr. Smith" />);

    const slotButton = await screen.findByRole('button', { name: /10:00 AM/i });
    await user.click(slotButton);

    await user.type(screen.getByLabelText(/Primary Symptom or Reason for Visit/i), 'Headache');
    await user.type(screen.getByLabelText(/Symptom Duration/i), '1 day');

    await user.click(screen.getByRole('button', { name: /Confirm & Book Appointment/i }));

    expect(
      await screen.findByText(/That time slot was just taken by another patient/i)
    ).toBeInTheDocument();
  });
});
