import { useQuery } from '@tanstack/react-query';
import * as referralsService from '../../../services/referrals-service';
import { useAuthStore } from '../../../store/auth-store';

function sentKey() {
  return ['referrals', 'sent'] as const;
}

/** `GET /referrals/created` — every referral this doctor created, including
 * expired and loop-flagged ones. Not paginated, so this is a single query
 * rather than an infinite one. */
export function useSentReferrals() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: sentKey(),
    queryFn: ({ signal }) => referralsService.listCreatedReferrals(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}
