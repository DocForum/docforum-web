import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import * as doctorTodayService from '../../../services/doctor-today-service';
import { ApiError } from '../../../services/api-client';
import type { Appointment, IntakeForm } from '../../../types/models';
import { TodayAppointments } from './TodayAppointments';

vi.mock('../../../services/queue-service');
vi.mock('../../../services/doctor-today-service');

const APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-2',
    doctorProfileId: 'doc-1',
    patientProfileId: 'pat-2',
    patientName: 'Second Patient (fake)',
    startsAt: '2026-10-20T10:00:00Z',
    endsAt: '2026-10-20T10:30:00Z',
    status: 'scheduled',
    reason: 'Demo follow-up (fake)',
  },
  {
    id: 'apt-1',
    doctorProfileId: 'doc-1',
    patientProfileId: 'pat-1',
    patientName: 'First Patient (fake)',
    startsAt: '2026-10-20T09:00:00Z',
    endsAt: '2026-10-20T09:30:00Z',
    status: 'checked_in',
    reason: 'Demo cough (fake)',
  },
];

const INTAKE: IntakeForm = {
  id: 'intake-1',
  appointmentId: 'apt-1',
  patientProfileId: 'pat-1',
  submittedAt: '2026-10-20T08:45:00Z',
  chiefComplaint: 'Demo cough for three days (fake)',
  symptomDuration: '3 days',
  severity: 6,
  currentMedications: ['Demo inhaler (fake)'],
  allergies: ['Demo penicillin allergy (fake)'],
  notes: 'Demo intake note (fake).',
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(queueService.listTodayAppointments).mockResolvedValue(APPOINTMENTS);
  vi.mocked(doctorTodayService.getAppointmentIntake).mockResolvedValue(INTAKE);
});

describe('TodayAppointments', () => {
  it("lists today's appointments in start-time order", async () => {
    render(<TodayAppointments />);

    const names = await screen.findAllByText(/Patient \(fake\)/);
    expect(names.map((node) => node.textContent)).toEqual([
      'First Patient (fake)',
      'Second Patient (fake)',
    ]);
    expect(screen.getByText(/2 scheduled/i)).toBeInTheDocument();
  });

  it('expands an appointment to show the structured intake', async () => {
    const user = userEvent.setup();
    render(<TodayAppointments />);

    const firstRow = await screen.findByRole('button', { name: /First Patient/i });
    expect(firstRow).toHaveAttribute('aria-expanded', 'false');

    await user.click(firstRow);

    expect(firstRow).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Demo cough for three days (fake)')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('6 / 10')).toBeInTheDocument();
    expect(screen.getByText('Demo inhaler (fake)')).toBeInTheDocument();
    expect(screen.getByText('Demo intake note (fake).')).toBeInTheDocument();
    await waitFor(() => {
      expect(doctorTodayService.getAppointmentIntake).toHaveBeenCalledWith(
        'apt-1',
        'test-token',
        expect.any(AbortSignal),
      );
    });
  });

  it('says when no intake was submitted', async () => {
    vi.mocked(doctorTodayService.getAppointmentIntake).mockRejectedValue(
      new ApiError('not found', 404),
    );
    const user = userEvent.setup();
    render(<TodayAppointments />);

    await user.click(await screen.findByRole('button', { name: /First Patient/i }));

    expect(
      await screen.findByText(/no intake was submitted for this appointment/i),
    ).toBeInTheDocument();
  });

  it('surfaces other intake failures', async () => {
    vi.mocked(doctorTodayService.getAppointmentIntake).mockRejectedValue(
      new ApiError('service down', 503),
    );
    const user = userEvent.setup();
    render(<TodayAppointments />);

    await user.click(await screen.findByRole('button', { name: /First Patient/i }));

    expect(await screen.findByText(/could not load this intake/i)).toBeInTheDocument();
  });
});
