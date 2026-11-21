import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { CareTimeline } from './CareTimeline';
import type { CareThread } from '../../../types/models';

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

const THREAD: CareThread = {
  id: 'thread-es',
  patientProfileId: 'p1',
  title: 'Seguimiento',
  doctorName: 'Dra. Sánchez',
  specialty: 'Cardiología',
  startedAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-02T10:00:00Z',
  status: 'active',
  steps: [
    {
      id: 'step-1',
      stepType: 'appointment',
      title: 'Cita inicial',
      description: 'Consulta de evaluación.',
      status: 'action_required',
      timestamp: '2026-10-01T10:00:00Z',
    },
    {
      id: 'step-2',
      stepType: 'consultation',
      title: 'Consulta realizada',
      description: 'Sin hallazgos.',
      status: 'completed',
    },
  ],
};

describe('CareTimeline (es)', () => {
  it('translates the header, status labels and the concluded-episode note', () => {
    renderSpanish(<CareTimeline thread={THREAD} />);

    expect(screen.getByText('episodio asistencial activo')).toBeInTheDocument();
    expect(screen.getByText('Médico: Dra. Sánchez (Cardiología)')).toBeInTheDocument();
    expect(screen.getByText('Iniciado:')).toBeInTheDocument();
    expect(screen.getAllByText('Acción requerida').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completado').length).toBeGreaterThan(0);
    expect(screen.getByText('Episodio asistencial concluido:')).toBeInTheDocument();
    expect(screen.getByText(/no consideró necesarias las derivaciones a especialistas/)).toBeInTheDocument();
  });

  it('translates the empty state', () => {
    renderSpanish(<CareTimeline thread={null} />);

    expect(screen.getByRole('heading', { name: 'No se encontró ningún itinerario asistencial' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a tu centro de atención' })).toBeInTheDocument();
  });
});
