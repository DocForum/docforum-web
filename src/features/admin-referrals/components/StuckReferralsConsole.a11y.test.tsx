import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { makeStuckReferral } from '../../../test/factories';
import { StuckReferralsConsole } from './StuckReferralsConsole';
import { useStuckReferrals } from '../hooks/useStuckReferrals';

vi.mock('../hooks/useStuckReferrals');

describe('StuckReferralsConsole accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useStuckReferrals).mockReturnValue({
      data: {
        pages: [
          {
            items: [
              makeStuckReferral({ stuckReason: 'no_doctor' }),
              makeStuckReferral({ stuckReason: 'doctor_inactive', status: 'pending' }),
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
    const { container } = renderWithProviders(<StuckReferralsConsole />, {
      route: '/admin/referrals',
      role: 'admin',
    });

    expect(await screen.findByRole('heading', { name: 'Stuck referrals' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('labels the age filter and exposes the reason filter as a group', async () => {
    renderWithProviders(<StuckReferralsConsole />, { route: '/admin/referrals', role: 'admin' });

    expect(await screen.findByLabelText(/Pending for at least/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filter by reason' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
