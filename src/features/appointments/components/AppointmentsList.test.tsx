import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { AppointmentsList } from './AppointmentsList';
import { useAuthStore } from '../../../store/auth-store';
import type { PatientAppointment } from '../../../types/models';
import * as appointmentsService from '../../../services/appointments-service';

vi.mock('../../../services/appointments-service');

const MOCK_APPOINTMENT: PatientAppointment = {
  id: 'apt-101',
  patientProfileId: 'pat-1',
  doctorProfileId: 'doc-1',
  doctorName: 'Dr. Jane Doe',
  doctorSpecialty: 'Cardiology',
  availabilitySlotId: 'slt-101',
  status: 'scheduled',
  origin: 'direct_booking',
  availabilitySlot: {
    id: 'slt-101',
    doctorProfileId: 'doc-1',
    status: 'booked',
    startTime: '2026-10-30T10:00:00.000Z',
    endTime: '2026-10-30T10:30:00.000Z',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('AppointmentsList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.listMyAppointments).mockReset();
  });

  it('renders list of patient appointments', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([MOCK_APPOINTMENT]);

    render(<AppointmentsList />);

    expect(await screen.findByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
  });

  it('shows empty state when patient has no appointments', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([]);

    render(<AppointmentsList />);

    expect(await screen.findByText(/You have no booked appointments yet/i)).toBeInTheDocument();
  });
});
