import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render';
import type { AdminSuccessMetrics } from '../../../types/models';
import * as metricsService from '../../../services/admin-metrics-service';
import { AdminMetricsDashboard } from './AdminMetricsDashboard';

vi.mock('../../../services/admin-metrics-service', () => ({
  getAdminSuccessMetrics: vi.fn(),
}));

const response: AdminSuccessMetrics = {
  window: {
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-11-01T00:00:00.000Z',
    timeZone: 'UTC',
  },
  minimumCellCount: 5,
  metrics: {
    noShowRate: { status: 'suppressed', value: null, numerator: null, denominator: null },
    bookingLeadTimeDays: { status: 'available', value: 3.2, unit: 'days', denominator: 50 },
    timeFromSymptomToOrder: { status: 'not_yet_available', value: null },
    referralCompletionRate: { status: 'not_yet_available', value: null },
    ordersFulfilledWithinNDays: { status: 'not_yet_available', value: null },
  },
};

describe('AdminMetricsDashboard', () => {
  beforeEach(() => {
    vi.mocked(metricsService.getAdminSuccessMetrics).mockReset();
    vi.mocked(metricsService.getAdminSuccessMetrics).mockResolvedValue(response);
  });

  it('renders definitions, privacy suppression, table alternatives and unavailable metrics', async () => {
    renderWithProviders(<AdminMetricsDashboard />, { role: 'admin' });
    expect(await screen.findByText(/fewer than 5 eligible appointments/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Symptom to order' })).toBeInTheDocument();
    expect(screen.getAllByText('Not yet available')).toHaveLength(3);
    expect(screen.getByRole('table', { name: 'Booking lead time data for the selected range' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Booking lead time: 3.2 days/ })).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('applies a selected date range to the metrics request', async () => {
    renderWithProviders(<AdminMetricsDashboard />, { role: 'admin' });
    await screen.findByRole('heading', { name: 'Patient no-show rate' });

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('From'));
    await user.type(screen.getByLabelText('From'), '2026-10-01');
    await user.clear(screen.getByLabelText('Through'));
    await user.type(screen.getByLabelText('Through'), '2026-10-31');
    await user.click(screen.getByRole('button', { name: 'Apply date range' }));

    expect(await screen.findByText(/Day boundaries use/)).toBeInTheDocument();
    expect(metricsService.getAdminSuccessMetrics).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      'test-admin-token',
      expect.any(AbortSignal),
    );
    const [, end] = vi.mocked(metricsService.getAdminSuccessMetrics).mock.lastCall!;
    expect(Date.parse(end)).toBeGreaterThan(Date.parse('2026-10-31T00:00:00.000Z'));
  });
});
