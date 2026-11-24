import { useInfiniteQuery } from '@tanstack/react-query';
import * as referralsService from '../../../services/referrals-service';
import { useAuthStore } from '../../../store/auth-store';
import type { ReferralInboxFilter } from '../../../services/referrals-service';

export const REFERRAL_PAGE_LIMIT = 20;

export type ReferralInboxView = 'all' | ReferralInboxFilter;

// The view filter is part of the key so switching tabs never mixes cached
// pages. Pagination state lives here (React Query) — not storage — per
// ARCHITECTURE_ESSENTIALS.md.
function inboxKey(view: ReferralInboxView) {
  return ['referrals', 'inbox', view] as const;
}

export function useReferralInbox(view: ReferralInboxView) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: inboxKey(view),
    queryFn: ({ pageParam }) =>
      referralsService.listReferrals(
        { status: view === 'all' ? null : view, cursor: pageParam, limit: REFERRAL_PAGE_LIMIT },
        accessToken!,
      ),
    initialPageParam: null as string | null,
    // The server ends the sequence with `nextCursor: null`; React Query v5
    // reads "no next page" from an `undefined` return, so translate.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}
