import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '../../../test/render';
import { useSentReferrals } from './useSentReferrals';
import { useAuthStore } from '../../../store/auth-store';
import * as referralsService from '../../../services/referrals-service';
import type { SentReferral } from '../../../types/models';

vi.mock('../../../services/referrals-service');

const REFERRAL: SentReferral = {
  id: 'ref-sent-1',
  status: 'pending',
  targetDoctorId: 'doc-1',
  targetSpecialtyId: 'spc-cardio',
  referringDoctorNotifiedAt: null,
  loopFlaggedAt: null,
  loopFlagReason: null,
  noShowCount: 0,
  expiredAt: null,
  expiredReason: null,
  resultingAppointmentId: null,
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSentReferrals', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listCreatedReferrals).mockReset();
  });

  it('reads the whole created-referrals array once', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([REFERRAL]);

    const { result } = renderHook(() => useSentReferrals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(referralsService.listCreatedReferrals).toHaveBeenCalledWith('test-token', expect.any(AbortSignal));
    expect(result.current.data).toEqual([REFERRAL]);
  });

  it('does not call the endpoint without an access token', () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useSentReferrals(), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
    expect(referralsService.listCreatedReferrals).not.toHaveBeenCalled();
  });
});
