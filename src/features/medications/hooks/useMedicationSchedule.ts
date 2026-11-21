import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import * as prescriptionsService from '../../../services/prescriptions-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { buildMedicationSchedule } from '../schedule';

// The `now` default is applied here, at the hook boundary — schedule.ts stays
// pure and fully deterministic. Fixing it once per mount keeps Today/This-week
// from drifting while the tree re-renders.
export function useMedicationSchedule() {
  const intl = useIntl();
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);

  const query = useQuery({
    queryKey: ['prescriptions', profileId, 'active'],
    queryFn: () => prescriptionsService.listActivePrescriptions(profileId!, accessToken!),
    enabled: Boolean(accessToken && profileId),
  });

  const now = useMemo(() => new Date(), []);
  const schedule = useMemo(
    () => buildMedicationSchedule(query.data ?? [], now, 7, intl.locale),
    [query.data, now, intl.locale],
  );

  return { ...query, now, schedule };
}
