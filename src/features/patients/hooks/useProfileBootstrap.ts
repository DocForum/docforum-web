import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as patientsService from '../../../services/patients-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';

/** Loads the signed-in patient's own profile and seeds the acting-for store.
 * Without this `selectedProfileId` stays null and every profile-scoped read
 * (`/patients/:profileId/...`) is disabled, so the W2 patient screens never
 * fetch. */
export function useProfileBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setProfiles = useProfileStore((state) => state.setProfiles);

  const query = useQuery({
    queryKey: ['patient-profiles', 'me'],
    queryFn: () => patientsService.getMyPatientProfile(accessToken!),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (!query.data) return;
    setProfiles([{ id: query.data.id, fullName: query.data.fullName, isSelf: true }]);
  }, [query.data, setProfiles]);

  return query;
}
