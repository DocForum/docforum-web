import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../store/auth-store';
import { useLogout } from './useLogout';

vi.mock('../../../services/auth-service', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'patient-user',
        email: 'patient@example.test',
        role: 'patient',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      accessToken: 'token',
    });
  });

  it('clears cached records and session state when logout settles', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['care-threads', 'profile-1'], [{ id: 'private-record' }]);
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
