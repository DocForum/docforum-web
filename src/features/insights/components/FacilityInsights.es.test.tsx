import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import type { FacilityPerformanceInsights } from '../../../types/models';
import { FacilityInsightsView } from './FacilityInsightsView';

const INSIGHTS: FacilityPerformanceInsights = {
  facilityId: 'fac-main',
  range: { preset: '30d', startDate: '2026-09-18', endDate: '2026-10-18' },
  generatedAt: '2026-10-18T06:00:00.000Z',
  turnaround: {
    fulfilledCount: 68,
    medianHours: 3.5,
    p90Hours: 27.4,
    minHours: 0.4,
    maxHours: 51.2,
    within1h: 12,
    within4h: 38,
    within24h: 61,
    over24h: 7,
    sampleSizeWarning: false,
  },
  volumeByDay: [{ date: '2026-10-17', received: 8, fulfilled: 6, rejected: 2 }],
  rejectionReasons: [{ code: 'out_of_stock', label: 'Out of stock', count: 4, percentage: 100 }],
  disputes: {
    totalOrders: 68,
    disputedOrders: 3,
    disputeRate: 4.4,
    resolvedInFacilityFavour: 1,
    resolvedInPatientFavour: 1,
    openDisputes: 1,
    averageResolutionHours: 40.5,
    sampleSizeWarning: false,
  },
};

describe('FacilityInsightsView in Spanish (#251)', () => {
  it('renders Spanish copy instead of the hard-coded English headings', () => {
    render(
      <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
        <FacilityInsightsView facilityId="fac-main" initialData={INSIGHTS} />
      </IntlProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Datos de rendimiento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tiempo de cumplimiento' })).toBeInTheDocument();
    expect(screen.queryByText('Performance insights')).not.toBeInTheDocument();
    expect(screen.queryByText('Turnaround time')).not.toBeInTheDocument();
  });
});
