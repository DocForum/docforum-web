import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { MedicationSchedule } from './MedicationSchedule';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import * as prescriptionsService from '../../../services/prescriptions-service';
import type { MedicationPrescription } from '../../../types/models';

vi.mock('../../../services/prescriptions-service');

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

const NOW = new Date('2026-10-20T10:00:00Z');

function prescription(now: Date = NOW): MedicationPrescription {
  const created = new Date(now);
  created.setHours(6, 0, 0, 0);
  return {
    id: 'rx-es',
    status: 'issued',
    createdAt: created.toISOString(),
    patientProfileId: 'pp-1',
    prescribingDoctorId: 'dr-1',
    prescribingDoctorName: 'Dra. Sánchez',
    items: [
      { id: 'i1', drugName: 'Amoxicilina', dosage: '500 mg', frequency: 'every 8 hours', duration: '5 days' },
    ],
  };
}

describe('MedicationSchedule (es)', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({
      profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }],
      selectedProfileId: 'pp-1',
    });
    vi.mocked(prescriptionsService.listActivePrescriptions).mockReset();
  });

  it('translates the clinical disclaimer, headings and calendar action', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([prescription()]);

    renderSpanish(<MedicationSchedule />);

    expect(
      await screen.findByText(/sigue siempre las instrucciones de quien te recetó/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Esta semana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir al calendario (.ics)' })).toBeInTheDocument();
  });

  it('translates the empty state', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([]);

    renderSpanish(<MedicationSchedule />);

    expect(await screen.findByText('No hay recetas activas.')).toBeInTheDocument();
  });

  it('translates the overlap safety warning with the drug name', async () => {
    const now = new Date();
    const first = prescription(now);
    const second = prescription(now);
    second.id = 'rx-es-2';
    second.items = [{ ...second.items[0], id: 'i2', drugName: 'amoxicilina' }];
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([first, second]);

    renderSpanish(<MedicationSchedule />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Tienes más de un tratamiento actual de Amoxicilina');
    expect(alert).toHaveTextContent('no elijas entre ellos por tu cuenta');
  });
});
