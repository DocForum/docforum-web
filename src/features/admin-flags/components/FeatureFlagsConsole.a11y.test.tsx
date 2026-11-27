import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { makeFeatureFlag } from '../../../test/factories';
import { FeatureFlagsConsole } from './FeatureFlagsConsole';
import { useFeatureFlags, useFlagHistory, useSavingFlagKeys, useUpdateFeatureFlag } from '../hooks/useFeatureFlags';

vi.mock('../hooks/useFeatureFlags');

const FLAGS = [
  makeFeatureFlag({ key: 'wallet_payments', kind: 'percentage', enabled: true, rolloutPercentage: 25 }),
  makeFeatureFlag({
    key: 'telehealth',
    kind: 'boolean',
    enabled: false,
    targeting: { roles: ['doctor'], userIds: [] },
  }),
];

describe('FeatureFlagsConsole accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      data: FLAGS,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useFlagHistory).mockReturnValue({
      data: { items: [], nextCursor: null },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useSavingFlagKeys).mockReturnValue(new Set());
    vi.mocked(useUpdateFeatureFlag).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as never);
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderWithProviders(<FeatureFlagsConsole />, {
      route: '/admin/flags',
      role: 'admin',
    });

    expect(await screen.findByRole('heading', { name: 'wallet_payments' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives every flag switch an accessible name that includes the flag key', async () => {
    renderWithProviders(<FeatureFlagsConsole />, { route: '/admin/flags', role: 'admin' });

    const switches = await screen.findAllByRole('switch');
    expect(switches).toHaveLength(FLAGS.length);
    for (const control of switches) {
      expect(control).toHaveAccessibleName(/wallet_payments|telehealth/);
    }
  });
});
