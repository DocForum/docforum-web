import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { makeDisputeSummary } from '../../../test/factories';
import { DisputesQueue } from './DisputesQueue';
import { useOpenDisputes } from '../hooks/useDisputes';

vi.mock('../hooks/useDisputes');

describe('DisputesQueue accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useOpenDisputes).mockReturnValue({
      data: {
        pages: [
          {
            items: [
              makeDisputeSummary({ reason: 'not_received' }),
              makeDisputeSummary({ reason: 'damaged', status: 'open' }),
            ],
            nextCursor: null,
          },
        ],
      },
      error: null,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      dataUpdatedAt: Date.parse('2026-10-21T12:00:00.000Z'),
    } as never);
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderWithProviders(<DisputesQueue />, {
      route: '/admin/disputes',
      role: 'admin',
    });

    expect((await screen.findAllByText('Demo Pharmacy (fake)')).length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('names the queue and every resolution action for assistive technology', async () => {
    renderWithProviders(<DisputesQueue />, { route: '/admin/disputes', role: 'admin' });

    expect(
      await screen.findByRole('heading', { name: 'Fulfilment disputes' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review dispute' })).toHaveLength(2);
  });
});
