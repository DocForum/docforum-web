import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as availabilityService from '../../../services/availability-service';
import * as doctorService from '../../../services/doctor-service';
import { useAuthStore } from '../../../store/auth-store';
import { windowBounds } from '../calendar';
import type { IsoDate } from '../calendar';

/** All cached windows for one doctor share this prefix, which is what the
 * mutations use to find every list they have to update (and roll back). */
export function doctorSlotsKey(doctorProfileId: string) {
  return ['availability', 'doctor', doctorProfileId, 'slots'] as const;
}

export function slotsWindowKey(doctorProfileId: string, from: string, to: string) {
  return [...doctorSlotsKey(doctorProfileId), from, to] as const;
}

export function useMyDoctorProfile() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['doctor', 'me'],
    queryFn: () => doctorService.getMyDoctorProfile(accessToken!),
    enabled: Boolean(accessToken),
  });
}

interface SlotsWindowParams {
  doctorProfileId: string | null;
  dates: readonly IsoDate[];
  timeZone: string;
}

/** The manager's own data source: every status, past included. Core's public
 * `GET /availability/doctors/:id/slots` returns open future slots only, which
 * is why the week view cannot be built on it. */
export function useAvailabilitySlots({ doctorProfileId, dates, timeZone }: SlotsWindowParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const dateKey = dates.join('|');
  // `dates` is a fresh array on every render; the joined key is the stable
  // dependency behind the window bounds.
  const bounds = useMemo(() => windowBounds(dateKey ? dateKey.split('|') : [], timeZone), [dateKey, timeZone]);

  return useQuery({
    queryKey: slotsWindowKey(doctorProfileId ?? '', bounds?.from ?? '', bounds?.to ?? ''),
    queryFn: () => availabilityService.listMySlots(doctorProfileId!, bounds!.from, bounds!.to, accessToken!),
    enabled: Boolean(accessToken && doctorProfileId && bounds),
  });
}
