import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { createSeedDb } from '../../../mocks/fixtures';
import { FacilityFulfillmentQueue } from './FacilityFulfillmentQueue';

describe('FacilityFulfillmentQueue in Spanish (#251)', () => {
  it('renders Spanish copy instead of the hard-coded English headings and labels', () => {
    render(
      <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
        <FacilityFulfillmentQueue
          items={createSeedDb().fulfillmentQueue}
          isDispensing={false}
          onDispense={vi.fn().mockResolvedValue(undefined)}
          onReject={vi.fn().mockResolvedValue(undefined)}
        />
      </IntlProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Cola de cumplimiento' })).toBeInTheDocument();
    expect(screen.getAllByText(/Receta para Pat Placeholder/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Fulfillment queue')).not.toBeInTheDocument();
    expect(screen.queryByText(/Dispense items individually/i)).not.toBeInTheDocument();
  });
});
