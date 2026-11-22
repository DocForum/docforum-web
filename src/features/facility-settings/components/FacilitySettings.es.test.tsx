import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import type { FacilitySettings } from '../../../types/models';
import { emptyOpeningHours } from '../validation';
import { LocationContactEditor } from './LocationContactEditor';

const SETTINGS: FacilitySettings = {
  facilityId: 'fac-main',
  name: 'Central Pharmacy',
  type: 'pharmacy',
  address: '12 Fixture High Street',
  city: 'Sampleton',
  latitude: 6.5244,
  longitude: 3.3792,
  phone: '+000 000 0012',
  email: 'central.pharmacy@example.test',
  openingHours: emptyOpeningHours(),
  updatedAt: '2026-10-18T09:00:00.000Z',
};

describe('Facility settings in Spanish (#251)', () => {
  it('renders Spanish copy instead of the hard-coded English labels', () => {
    render(
      <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
        <LocationContactEditor
          facilityId="fac-main"
          settings={SETTINGS}
          onDirtyChange={() => undefined}
        />
      </IntlProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Ubicación y contacto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Dirección postal')).toBeInTheDocument();
    // Weekday names come from Intl using the active locale.
    expect(screen.getByLabelText('lunes')).toBeInTheDocument();
    expect(screen.queryByText('Location & contact')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Street address')).not.toBeInTheDocument();
  });
});
