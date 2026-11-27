import { useQuery } from '@tanstack/react-query';
import * as referralsService from '../../../services/referrals-service';
import { useAuthStore } from '../../../store/auth-store';

function detailKey(referralId: string) {
  return ['referrals', 'detail', referralId] as const;
}

/** A 403/404 here means the referral was reassigned to another specialist —
 * the detail page renders the access-denied state from the error status
 * rather than here, so the query error stays available to the caller. */
export function useReferralDetail(referralId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: detailKey(referralId ?? ''),
    queryFn: () => referralsService.getReferralDetail(referralId!, accessToken!),
    enabled: Boolean(accessToken && referralId),
  });
}
