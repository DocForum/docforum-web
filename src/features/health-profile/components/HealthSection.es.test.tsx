import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { fireEvent, render, screen } from '../../../test/render';
import { HealthSection } from './HealthSection';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import * as healthService from '../../../services/health-profile-service';

vi.mock('../../../services/health-profile-service');

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('HealthSection (es)', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({
      profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }],
      selectedProfileId: 'pp-1',
    });
    vi.mocked(healthService.listHealthEntries).mockReset();
  });

  it('translates the section heading, add button and empty state', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([]);

    renderSpanish(<HealthSection section="allergies" />);

    expect(await screen.findByRole('heading', { name: 'Alergias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument();
    expect(await screen.findByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar el primero' })).toBeInTheDocument();
    expect(screen.getByText(/ven tus alergias en cada consulta/i)).toBeInTheDocument();
  });

  it('translates the add form labels and actions', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([]);

    renderSpanish(<HealthSection section="medications" />);
    await screen.findByText('Sin registros');
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(screen.getByRole('heading', { name: 'Medicamentos actuales' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Detalles (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });
});
