import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { makeBackgroundJob, makeReadinessReport } from '../../../test/factories';
import { SystemHealthConsole } from './SystemHealthConsole';
import { useJobs, useOutboxSummary, useReadiness, useRunJob } from '../hooks/useSystemHealth';

vi.mock('../hooks/useSystemHealth');

const NOW = Date.parse('2026-10-21T12:00:00.000Z');

function source<T>(data: T) {
  return {
    data,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    dataUpdatedAt: NOW,
  } as never;
}

describe('SystemHealthConsole accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useReadiness).mockReturnValue(
      source({ report: makeReadinessReport(), respondedInMs: 24 }),
    );
    vi.mocked(useJobs).mockReturnValue(
      source([
        makeBackgroundJob({ name: 'expire_orders', running: false }),
        makeBackgroundJob({ name: 'release_escrow', running: true }),
      ]),
    );
    vi.mocked(useOutboxSummary).mockReturnValue(
      source({ pendingCount: 0, deadLetterCount: 1, oldestPendingAt: null }),
    );
    vi.mocked(useRunJob).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as never);
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderWithProviders(<SystemHealthConsole />, {
      route: '/admin/system',
      role: 'admin',
    });

    expect(await screen.findByRole('heading', { name: 'System health' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('labels the readiness, jobs and outbox regions', async () => {
    renderWithProviders(<SystemHealthConsole />, { route: '/admin/system', role: 'admin' });

    expect(
      await screen.findByRole('heading', { name: 'Readiness checks' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeInTheDocument();
    expect(screen.getByText('expire_orders')).toBeInTheDocument();
  });
});
