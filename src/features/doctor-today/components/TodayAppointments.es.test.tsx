import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import * as doctorTodayService from '../../../services/doctor-today-service';
import type { Appointment, IntakeForm } from '../../../types/models';
import { TodayAppointments } from './TodayAppointments';

vi.mock('../../../services/queue-service');
vi.mock('../../../services/doctor-today-service');

const APPOINTMENTS: Appointment[] = [
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

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('TodayAppointments in Spanish', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(queueService.listTodayAppointments).mockResolvedValue(APPOINTMENTS);
    vi.mocked(doctorTodayService.getAppointmentIntake).mockResolvedValue(INTAKE);
  });

  it('translates the heading, count, statuses and intake labels', async () => {
    const user = userEvent.setup();
    renderEs(<TodayAppointments />);

    expect(screen.getByRole('heading', { name: 'Citas de hoy' })).toBeInTheDocument();
    expect(await screen.findByText('2 programadas')).toBeInTheDocument();
    expect(await screen.findByText('Registrada')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /First Patient/i }));

    expect(await screen.findByText('Motivo principal')).toBeInTheDocument();
    expect(screen.getByText('Gravedad')).toBeInTheDocument();
    expect(screen.getByText('Medicamentos actuales')).toBeInTheDocument();
    expect(screen.getByText('Alergias')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Admisión' })).toBeInTheDocument();
  });
});
