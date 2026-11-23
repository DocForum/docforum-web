import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { PatientChartPanel } from './PatientChartPanel';

const EMPTY_CHART = {
  allergies: [],
  conditions: [],
  medications: [],
  careThread: null,
  activeOrders: [],
  recentResults: [],
  isLoading: false,
  error: null,
};

vi.mock('../hooks/usePatientChart', () => ({
  usePatientChart: () => EMPTY_CHART,
}));

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('PatientChartPanel in Spanish', () => {
  it('translates the section headings and empty states', () => {
    renderEs(<PatientChartPanel patientProfileId="pat-1" />);

    expect(screen.getByRole('heading', { name: 'Historia del paciente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perfil de salud' })).toBeInTheDocument();
    expect(screen.getByText('No hay alergias registradas.')).toBeInTheDocument();
    expect(screen.getByText('No hay afecciones registradas.')).toBeInTheDocument();
    expect(screen.getByText('No hay medicamentos registrados.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Órdenes activas' })).toBeInTheDocument();
    expect(screen.getByText('No hay órdenes activas.')).toBeInTheDocument();
    expect(screen.getByText('No hay resultados recientes.')).toBeInTheDocument();
  });
});
