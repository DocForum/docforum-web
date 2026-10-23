import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '../../../test/render';
import { useReferralInbox } from './useReferralInbox';
import { useAuthStore } from '../../../store/auth-store';
import * as referralsService from '../../../services/referrals-service';
import type { CursorPage, ReferralSummary } from '../../../types/models';

vi.mock('../../../services/referrals-service');

function makeSummary(id: string): ReferralSummary {
  return {
    id,
    status: 'pending',
    snapshotNotes: `Snapshot notes for ${id}`,
    referringDoctor: { id: 'doc-1', fullName: 'Dr. Amara Okafor' },
    snapshotTakenAt: '2026-09-30T08:15:00.000Z',
    createdAt: '2026-09-30T08:15:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  };
}

function makePage(ids: string[], nextCursor: string | null): CursorPage<ReferralSummary> {
  return { items: ids.map(makeSummary), nextCursor };
}

// A fresh QueryClient per renderHook call, mirroring src/test/render.tsx —
// the shared render() helper only wraps components, and this hook needs no
// router.
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useReferralInbox', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listReferrals).mockReset();
  });

  it('requests the first page with a null cursor, no status, and the page limit', async () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue(makePage(['r-1', 'r-2'], 'cursor-1'));

    const { result } = renderHook(() => useReferralInbox('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(referralsService.listReferrals).toHaveBeenCalledWith({ status: null, cursor: null, limit: 20 }, 'test-token');
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
  });

  it('passes nextCursor as the pageParam, appends the second page, and reports no next page once the cursor runs out', async () => {
    vi.mocked(referralsService.listReferrals).mockImplementation(({ cursor }) =>
      Promise.resolve(cursor === 'cursor-1' ? makePage(['r-3'], null) : makePage(['r-1', 'r-2'], 'cursor-1')),
    );

    const { result } = renderHook(() => useReferralInbox('all'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(referralsService.listReferrals).toHaveBeenLastCalledWith({ status: null, cursor: 'cursor-1', limit: 20 }, 'test-token');
    const ids = result.current.data?.pages.flatMap((page) => page.items.map((item) => item.id));
    expect(ids).toEqual(['r-1', 'r-2', 'r-3']);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('keeps the already-loaded pages when a later page fails', async () => {
    vi.mocked(referralsService.listReferrals)
      .mockImplementationOnce(() => Promise.resolve(makePage(['r-1'], 'cursor-1')))
      .mockImplementationOnce(() => Promise.reject(new Error('Network hiccup')));

    const { result } = renderHook(() => useReferralInbox('all'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.fetchNextPage().catch(() => undefined);

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data?.pages.flatMap((page) => page.items)).toHaveLength(1);
  });
});
