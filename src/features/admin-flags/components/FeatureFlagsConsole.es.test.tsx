import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { makeFeatureFlag } from '../../../test/factories';
import { FeatureFlagsConsole } from './FeatureFlagsConsole';
import { useFeatureFlags, useFlagHistory, useSavingFlagKeys, useUpdateFeatureFlag } from '../hooks/useFeatureFlags';

vi.mock('../hooks/useFeatureFlags');

const FLAG = makeFeatureFlag({
  key: 'wallet_payments',
  kind: 'percentage',
  enabled: true,
  rolloutPercentage: 25,
  description: 'Custodial wallet payments',
});

describe('FeatureFlagsConsole in Spanish (#248)', () => {
  beforeEach(() => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      data: [FLAG],
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

  it('renders the subtitle, search and state labels in Spanish', () => {
    renderWithProviders(<FeatureFlagsConsole />, {
      locale: 'es',
      route: '/admin/flags',
    });

    expect(screen.getByRole('heading', { name: 'Indicadores de función' })).toBeInTheDocument();
    expect(screen.getByText(/Despliegues graduales gestionados por docforum-core/)).toBeInTheDocument();
    expect(screen.getAllByText('En despliegue').length).toBeGreaterThan(0);
  });

  it('keeps flag keys and descriptions in English while translating the chrome', () => {
    renderWithProviders(<FeatureFlagsConsole />, {
      locale: 'es',
      route: '/admin/flags',
    });

    expect(screen.getByRole('heading', { name: 'wallet_payments' })).toBeInTheDocument();
    expect(screen.getByText('Custodial wallet payments')).toBeInTheDocument();
    expect(screen.queryByText(/Staged rollouts/)).not.toBeInTheDocument();
  });
});
