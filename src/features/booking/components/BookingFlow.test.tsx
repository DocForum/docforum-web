import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { BookingFlow } from './BookingFlow';
import { ApiError } from '../../../services/api-client';
import * as appointmentsService from '../../../services/appointments-service';
import type { AvailabilitySlot, BookedAppointment, IntakeRecord } from '../../../types/models';

vi.mock('../../../services/appointments-service');

const SLOT: AvailabilitySlot = {
  id: 'slot-1',
  doctorProfileId: 'doc-1',
  status: 'open',
  startTime: '2026-11-24T14:00:00.000Z',
  endTime: '2026-11-24T14:30:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const INTAKE: IntakeRecord = {
  id: 'intake-1',
  patientProfileId: 'pat-1',
  symptoms: [{ symptom: 'Headache', duration: '3 days', severity: 'moderate' }],
  freeTextNotes: null,
  createdAt: '2026-11-20T10:00:00.000Z',
};

const BOOKED: BookedAppointment = {
  id: 'apt-1',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-1',
  availabilitySlotId: 'slot-1',
  status: 'scheduled',
  origin: 'direct_booking',
  createdAt: '2026-11-20T10:01:00.000Z',
  updatedAt: '2026-11-20T10:01:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem('docforum-time-zone', 'UTC');
  vi.mocked(appointmentsService.createIntake).mockResolvedValue(INTAKE);
  vi.mocked(appointmentsService.bookAppointment).mockResolvedValue(BOOKED);
});

async function fillIntake(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Symptom 1'), 'Headache');
  await user.type(screen.getByLabelText('How long (symptom 1)'), '3 days');
  await user.selectOptions(screen.getByLabelText('Severity (symptom 1)'), 'moderate');
}

describe('BookingFlow intake', () => {
  it('collects structured symptoms rather than one free-text box', async () => {
    const user = userEvent.setup();
    render(<BookingFlow slot={SLOT} doctorId="doc-1" doctorName="Dr. Ada Example" />, { role: 'patient' });

    expect(screen.getByLabelText('Symptom 1')).toBeInTheDocument();
    expect(screen.getByLabelText('How long (symptom 1)')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity (symptom 1)')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /Add another symptom/i }));
    expect(screen.getByLabelText('Symptom 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove symptom 2/i })).toBeInTheDocument();
  });

  it('submits the structured intake before confirming the appointment', async () => {
    const user = userEvent.setup();
    render(<BookingFlow slot={SLOT} doctorId="doc-1" doctorName="Dr. Ada Example" />, { role: 'patient' });

    await fillIntake(user);
    await user.click(screen.getByRole('button', { name: /Continue to confirmation/i }));

    await waitFor(() =>
      expect(appointmentsService.createIntake).toHaveBeenCalledWith(
        {
          symptoms: [{ symptom: 'Headache', duration: '3 days', severity: 'moderate' }],
          freeTextNotes: undefined,
        },
        'test-patient-token',
      ),
    );
    expect(await screen.findByText(/Confirm your booking/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Confirm booking$/i }));

    await waitFor(() =>
      expect(appointmentsService.bookAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ availabilitySlotId: 'slot-1' }),
        'test-patient-token',
      ),
    );
    expect(await screen.findByText(/You're booked/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View my appointments/i })).toHaveAttribute(
      'href',
      '/patient/appointments',
    );
  });

  it('requires at least one complete symptom', async () => {
    const user = userEvent.setup();
    render(<BookingFlow slot={SLOT} doctorId="doc-1" doctorName="Dr. Ada Example" />, { role: 'patient' });

    await user.click(screen.getByRole('button', { name: /Continue to confirmation/i }));

    expect(screen.getByText(/Add at least one symptom/i)).toBeInTheDocument();
    expect(appointmentsService.createIntake).not.toHaveBeenCalled();
  });
});

describe('BookingFlow conflict handling', () => {
  it('explains a 409 as the slot being taken, with a way to pick another', async () => {
    vi.mocked(appointmentsService.bookAppointment).mockRejectedValue(
      new ApiError('That slot is no longer open.', 409),
    );
    const user = userEvent.setup();
    render(<BookingFlow slot={SLOT} doctorId="doc-1" doctorName="Dr. Ada Example" />, { role: 'patient' });

    await fillIntake(user);
    await user.click(screen.getByRole('button', { name: /Continue to confirmation/i }));
    await screen.findByText(/Confirm your booking/i);
    await user.click(screen.getByRole('button', { name: /^Confirm booking$/i }));

    expect(await screen.findByText(/That time was just taken/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Choose another time/i }).length).toBeGreaterThan(0);
    // The generic server sentence is not what the patient sees for a conflict.
    expect(screen.queryByText('That slot is no longer open.')).not.toBeInTheDocument();
  });
});
