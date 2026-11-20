import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as prescriptionsService from '../../../services/prescriptions-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { buildMedicationSchedule } from '../schedule';
import { useLocaleStore } from '../../../i18n/locale-store';

// The `now` default is applied here, at the hook boundary — schedule.ts stays
// pure and fully deterministic. Fixing it once per mount keeps Today/This-week
// from drifting while the tree re-renders.
export function useMedicationSchedule() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const locale = useLocaleStore((state) => state.locale);
  const timeZone = useLocaleStore((state) => state.timeZone);

  const query = useQuery({
    queryKey: ['prescriptions', profileId, 'active'],
    queryFn: () => prescriptionsService.listActivePrescriptions(profileId!, accessToken!),
    enabled: Boolean(accessToken && profileId),
  });

  const now = useMemo(() => new Date(), []);
  const schedule = useMemo(
    () => buildMedicationSchedule(query.data ?? [], now, 7, { locale, timeZone }),
    [query.data, now, locale, timeZone],
  );

  return { ...query, now, schedule };
}
