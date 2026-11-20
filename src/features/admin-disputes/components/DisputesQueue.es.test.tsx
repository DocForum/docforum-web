import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { makeDisputeSummary } from '../../../test/factories';
import { DisputesQueue } from './DisputesQueue';
import { useOpenDisputes } from '../hooks/useDisputes';

vi.mock('../hooks/useDisputes');

function mockQueue(items = [makeDisputeSummary({ reason: 'not_received' })]) {
  vi.mocked(useOpenDisputes).mockReturnValue({
    data: { pages: [{ items, nextCursor: null }] },
    error: null,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    dataUpdatedAt: Date.parse('2026-10-21T12:00:00.000Z'),
  } as never);
}

describe('DisputesQueue in Spanish (#248)', () => {
  beforeEach(() => {
    vi.mocked(useOpenDisputes).mockReset();
  });

  it('renders the heading, subtitle and count in Spanish', () => {
    mockQueue();

    renderWithProviders(<DisputesQueue />, {
      locale: 'es',
      route: '/admin/disputes',
    });

    expect(screen.getByRole('heading', { name: 'Disputas de cumplimiento' })).toBeInTheDocument();
    expect(screen.getByText(/permanece en depósito en garantía hasta que un administrador resuelva el caso/)).toBeInTheDocument();
    expect(screen.getByText(/1 disputa abierta/)).toBeInTheDocument();
  });

  it('translates dispute reasons but keeps order item and facility names untouched', () => {
    mockQueue();

    renderWithProviders(<DisputesQueue />, {
      locale: 'es',
      route: '/admin/disputes',
    });

    expect(screen.getByText('No recibido')).toBeInTheDocument();
    expect(screen.getByText(/Demo Amoxicillin 500mg/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Pharmacy \(fake\)/)).toBeInTheDocument();
  });
});
