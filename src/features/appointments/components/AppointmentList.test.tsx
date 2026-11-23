import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { AppointmentList } from './AppointmentList';
import * as appointmentsService from '../../../services/appointments-service';
import * as directoryService from '../../../services/doctor-directory-service';
import { ApiError } from '../../../services/api-client';
import type { PatientAppointment, PublicDoctor } from '../../../types/models';

vi.mock('../../../services/appointments-service');
vi.mock('../../../services/doctor-directory-service');

const DOCTOR: PublicDoctor = {
  id: 'doc-1',
  fullName: 'Dr. Ada Example',
  specialties: [{ id: 'spc-1', name: 'Dermatology', slug: 'dermatology' }],
};

const APPOINTMENT: PatientAppointment = {
  id: 'apt-1',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-1',
  availabilitySlotId: 'slot-1',
  status: 'scheduled',
  origin: 'direct_booking',
  availabilitySlot: {
    id: 'slot-1',
    doctorProfileId: 'doc-1',
    status: 'booked',
    startTime: '2026-11-24T14:00:00.000Z',
    endTime: '2026-11-24T14:30:00.000Z',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem('docforum-time-zone', 'UTC');
  vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);
  vi.mocked(directoryService.listAllPublicDoctors).mockResolvedValue([DOCTOR]);
});

describe('AppointmentList', () => {
  it('renders the real endpoint data with doctor, time and status', async () => {
    render(<AppointmentList />, { role: 'patient' });

    expect(await screen.findByText('Dr. Ada Example')).toBeInTheDocument();
    expect(screen.getByText(/24 November/)).toBeInTheDocument();
    expect(screen.getByText(/14:00-14:30/)).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View details/i })).toHaveAttribute(
      'href',
      '/patient/appointments/apt-1',
    );
    expect(appointmentsService.listMyAppointments).toHaveBeenCalledWith('test-patient-token', expect.anything());
  });

  it('shows an explanatory empty state with a next action', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([]);

    render(<AppointmentList />, { role: 'patient' });

    expect(await screen.findByText(/You have no appointments yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Find a doctor/i })).toHaveAttribute('href', '/patient/doctors');
  });

  it('does not present a failed read as an empty list', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockRejectedValue(new ApiError('Server down', 500));

    render(<AppointmentList />, { role: 'patient' });

    expect(await screen.findByText(/We couldn't load your appointments/i)).toBeInTheDocument();
    expect(screen.queryByText(/You have no appointments yet/i)).not.toBeInTheDocument();
  });
});
