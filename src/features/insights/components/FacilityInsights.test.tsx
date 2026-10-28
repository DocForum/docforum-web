import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { FacilityInsightsView } from './FacilityInsightsView';
import { FacilityTurnaroundCard } from './FacilityTurnaroundCard';
import { FacilityVolumeChart } from './FacilityVolumeChart';
import { FacilityRejectionReasonsCard } from './FacilityRejectionReasonsCard';
import { FacilityDisputeCard } from './FacilityDisputeCard';
import { useAuthStore } from '../../../store/auth-store';
import * as insightsService from '../../../services/insights-service';
import type { FacilityPerformanceInsights } from '../../../types/models';

vi.mock('../../../services/insights-service');

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
  volumeByDay: [
    { date: '2026-10-17', received: 8, fulfilled: 6, rejected: 2 },
    { date: '2026-10-18', received: 5, fulfilled: 4, rejected: 0 },
  ],
  rejectionReasons: [
    { code: 'out_of_stock', label: 'Out of stock', count: 4, percentage: 57.1 },
    { code: 'patient_unreachable', label: 'Patient unreachable', count: 3, percentage: 42.9 },
  ],
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

const LOW_SAMPLE: FacilityPerformanceInsights = {
  ...INSIGHTS,
  turnaround: { ...INSIGHTS.turnaround, fulfilledCount: 3, sampleSizeWarning: true },
  disputes: { ...INSIGHTS.disputes, totalOrders: 3, sampleSizeWarning: true },
};

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({
    accessToken: 'test-token',
    user: {
      id: 'user-facility-1',
      email: 'central.pharmacy@example.test',
      role: 'facility',
      createdAt: '',
      updatedAt: '',
    },
  });
  vi.mocked(insightsService.getFacilityPerformanceInsights).mockResolvedValue(INSIGHTS);
});

describe('Facility performance insights (#57)', () => {
  it('renders turnaround medians, volume, rejection reasons and dispute rate', async () => {
    render(<FacilityInsightsView facilityId="fac-main" />);

    expect(await screen.findByRole('heading', { name: /performance insights/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /turnaround time/i })).toBeVisible();
    expect(screen.getByText('3.5h')).toBeVisible();
    expect(screen.getByText('1.1d')).toBeVisible();
    expect(screen.getByRole('heading', { name: /order volume by day/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /rejection reasons/i })).toBeVisible();
    expect(screen.getAllByText(/out of stock/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /dispute rate/i })).toBeVisible();
    expect(screen.getByText('4.4%')).toBeVisible();
  });

  it('states clearly that only aggregate data is shown (no patient details)', async () => {
    render(<FacilityInsightsView facilityId="fac-main" />);
    expect(await screen.findByText(/aggregate data only/i)).toBeVisible();
    expect(screen.getByText(/never shows patient names/i)).toBeVisible();
  });

  it('exposes a table alternative for every chart', async () => {
    const user = userEvent.setup();
    render(<FacilityInsightsView facilityId="fac-main" />);
    await screen.findByRole('heading', { name: /performance insights/i });

    const tableViews = screen.getAllByRole('button', { name: /table view/i });
    expect(tableViews.length).toBeGreaterThanOrEqual(3);
    for (const button of tableViews) {
      await user.click(button);
    }

    expect(screen.getByRole('table', { name: /turnaround time bucket table/i })).toBeVisible();
    expect(screen.getByRole('table', { name: /order volume by day table/i })).toBeVisible();
    expect(screen.getByRole('table', { name: /rejection reasons table/i })).toBeVisible();
    expect(screen.getByRole('table', { name: /dispute outcome breakdown table/i })).toBeVisible();
  });

  it('labels small samples and flags them as not representative', () => {
    render(
      <FacilityInsightsView facilityId="fac-main" initialData={LOW_SAMPLE} />,
    );
    expect(screen.getAllByText(/small sample/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/may be skewed/i)).toBeVisible();
    expect(screen.getByText(/may not be representative/i)).toBeVisible();
  });

  it('reports an error instead of rendering stale data when the query fails', async () => {
    vi.mocked(insightsService.getFacilityPerformanceInsights).mockRejectedValue(
      new Error('boom'),
    );
    render(<FacilityInsightsView facilityId="fac-main" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
  });
});

describe('Facility insights sub-components', () => {
  it('turnaround card shows a chart/table toggle with accessible table', async () => {
    const user = userEvent.setup();
    render(<FacilityTurnaroundCard metrics={INSIGHTS.turnaround} />);
    await user.click(screen.getByRole('button', { name: /table view/i }));
    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getByText('Under 1 hour')).toBeVisible();
  });

  it('volume chart handles an empty period without crashing', () => {
    render(<FacilityVolumeChart days={[]} />);
    expect(screen.getByText(/no order volume recorded/i)).toBeVisible();
  });

  it('rejection card handles no rejections', () => {
    render(<FacilityRejectionReasonsCard reasons={[]} />);
    expect(screen.getByText(/no rejections in this period/i)).toBeVisible();
  });

  it('dispute card renders the outcome breakdown table', () => {
    render(<FacilityDisputeCard metrics={INSIGHTS.disputes} />);
    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getByText(/resolved in facility's favour/i)).toBeVisible();
    expect(screen.getByText(/resolved in patient's favour/i)).toBeVisible();
  });
});
