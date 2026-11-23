import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as patientReferralsService from '../../../services/patient-referrals-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type { AcceptReferralResult, PatientReferralList } from '../../../types/models';

export function patientReferralsKey(patientProfileId: string | null) {
  return ['patient', 'referrals', patientProfileId ?? 'me'] as const;
}

/** The patient's own referrals. Scoped by acting-for profile so a dependent's
 * referrals never appear under another profile's cache. */
export function usePatientReferrals() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedProfileId = useProfileStore((state) => state.selectedProfileId);

  return useQuery({
    queryKey: patientReferralsKey(selectedProfileId),
    queryFn: ({ signal }) => patientReferralsService.listMyReferrals(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

function replaceReferral(list: PatientReferralList, accepted: AcceptReferralResult): PatientReferralList {
  return {
    items: list.items.map((item) => (item.id === accepted.referral.id ? accepted.referral : item)),
  };
}

export function useAcceptReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referralId: string) => patientReferralsService.acceptReferral(referralId, accessToken!),
    onSuccess: (result) => {
      queryClient.setQueriesData<PatientReferralList>(
        { queryKey: ['patient', 'referrals'] },
        (current) => (current ? replaceReferral(current, result) : current),
      );
      void queryClient.invalidateQueries({ queryKey: ['patient', 'referrals'] });
      // Accepting creates a real appointment — the appointments list must not
      // keep showing the pre-acceptance state.
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeclineReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referralId: string) => patientReferralsService.declineReferral(referralId, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', 'referrals'] });
    },
  });
}
