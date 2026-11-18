import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import * as verificationService from '../../../services/doctor-verification-service';
import { getMyDoctorProfile } from '../../../services/doctor-service';
import { useAuthStore } from '../../../store/auth-store';

// Keys are exported so the mutation hooks invalidate exactly these reads and
// nothing else in the cache.
export const doctorProfileKey = ['doctor', 'profile'] as const;
export const credentialsKey = ['doctor', 'credentials'] as const;
export const specialtyCatalogKey = ['specialties'] as const;
export const specialtyClaimsKey = ['doctor', 'specialty-claims'] as const;

/** Any accepted submission can move the profile-level status out of `pending`
 * and changes what the checklist says, so all three reads are refetched. */
export function invalidateApplication(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: credentialsKey });
  queryClient.invalidateQueries({ queryKey: specialtyClaimsKey });
  queryClient.invalidateQueries({ queryKey: doctorProfileKey });
}

export function useDoctorProfile(options: { enabled?: boolean } = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: doctorProfileKey,
    queryFn: () => getMyDoctorProfile(accessToken!),
    // Callers that already hold the status (the route gate, a dashboard) can
    // turn the read off rather than paying for a second query.
    enabled: Boolean(accessToken) && (options.enabled ?? true),
  });
}

export function useCredentials() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: credentialsKey,
    queryFn: () => verificationService.listMyCredentials(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useSpecialtyCatalog() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: specialtyCatalogKey,
    queryFn: () => verificationService.listSpecialties(accessToken),
  });
}

export function useSpecialtyClaims() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: specialtyClaimsKey,
    queryFn: () => verificationService.listMySpecialtyClaims(accessToken!),
    enabled: Boolean(accessToken),
  });
}
