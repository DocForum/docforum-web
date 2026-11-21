import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import * as facilityTeamService from '../../../services/facility-team-service';
import { IntegrationsView } from './IntegrationsView';

vi.mock('../../../services/facility-team-service');

describe('IntegrationsView in Spanish (#251)', () => {
  it('renders Spanish copy instead of the hard-coded English page text', async () => {
    vi.mocked(facilityTeamService.listFacilityMembers).mockResolvedValue([]);
    vi.mocked(facilityTeamService.listFacilityInvites).mockResolvedValue([]);

    render(
      <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
        <IntegrationsView facilityId="fac-main" isOwnerOverride={false} />
      </IntlProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Integraciones' })).toBeInTheDocument();
    expect(
      screen.getByText(/Las integraciones están disponibles solo para propietarios de instalaciones/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Integrations are available to facility owners only/i)).not.toBeInTheDocument();
  });
});
