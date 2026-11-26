import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { SystemHealthConsole } from './SystemHealthConsole';
import { useJobs, useOutboxDeadLetters, useReadiness } from '../hooks/useSystemHealth';

vi.mock('../hooks/useSystemHealth');

const READINESS = {
  data: {
    report: {
      status: 'degraded',
      checkedAt: '2026-11-20T10:00:00.000Z',
      checks: [
        { name: 'database', status: 'pass', required: true, durationMs: 12, message: null },
        { name: 'stellar_rpc', status: 'fail', required: false, durationMs: 900, message: null },
      ],
    },
    respondedInMs: 950,
  },
  error: null,
  isLoading: false,
  isFetching: false,
  dataUpdatedAt: Date.parse('2026-11-20T10:00:00.000Z'),
  refetch: vi.fn(),
};

const MINUTE = 60_000;
// Relative to the real clock: `jobHealth` compares against Date.now().
const SOON = new Date(Date.now() + 5 * MINUTE).toISOString();
const RECENT = new Date(Date.now() - 5 * MINUTE).toISOString();

const JOBS = {
  data: [
    {
      name: 'expiry-sweep',
      schedule: 'every 5 minutes',
      running: false,
      nextRunAt: SOON,
      lastRun: { id: 'run-1', status: 'succeeded', startedAt: RECENT },
      lastSuccess: { startedAt: RECENT, itemsProcessed: 3 },
      lastFailure: null,
    },
  ],
  error: null,
  isLoading: false,
  isFetching: false,
  dataUpdatedAt: Date.parse('2026-11-20T10:00:00.000Z'),
  refetch: vi.fn(),
};

const OUTBOX = {
  data: { items: [] },
  error: null,
  isLoading: false,
  isFetching: false,
  dataUpdatedAt: Date.parse('2026-11-20T10:00:00.000Z'),
  refetch: vi.fn(),
};

describe('SystemHealthConsole in Spanish (#249)', () => {
  it('renders the console, panels and statuses from the Spanish catalogue', () => {
    vi.mocked(useReadiness).mockReturnValue(READINESS as never);
    vi.mocked(useJobs).mockReturnValue(JOBS as never);
    vi.mocked(useOutboxDeadLetters).mockReturnValue(OUTBOX as never);

    renderWithProviders(<SystemHealthConsole />, {
      locale: 'es',
      route: '/admin/system',
    });

    expect(screen.getByRole('heading', { name: 'Estado del sistema' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comprobaciones de disponibilidad' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trabajos en segundo plano' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar ahora' })).toBeInTheDocument();
    expect(screen.getAllByText('Degradado').length).toBeGreaterThan(0);
    expect(screen.getByText('Base de datos')).toBeInTheDocument();
    expect(screen.getByText('RPC de Stellar')).toBeInTheDocument();
    expect(screen.queryByText('System health')).not.toBeInTheDocument();
  });

  it('translates job status, run labels and durations', () => {
    vi.mocked(useReadiness).mockReturnValue(READINESS as never);
    vi.mocked(useJobs).mockReturnValue(JOBS as never);
    vi.mocked(useOutboxDeadLetters).mockReturnValue(OUTBOX as never);

    renderWithProviders(<SystemHealthConsole />, {
      locale: 'es',
      route: '/admin/system',
    });

    expect(screen.getAllByText('Correcto').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ejecutar ahora' })).toBeInTheDocument();
    expect(screen.getAllByText('Último éxito').length).toBeGreaterThan(0);
    // Durations are numbers plus a unit, never an English sentence.
    expect(screen.getAllByText(/\d+ (ms|s|min)/).length).toBeGreaterThan(0);
  });
});
