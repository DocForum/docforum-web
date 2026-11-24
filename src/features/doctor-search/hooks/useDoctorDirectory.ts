import { useQuery } from '@tanstack/react-query';
import {
  getPublicDoctor,
  listAllPublicDoctors,
  listPublicDoctors,
  listSpecialties,
} from '../../../services/doctor-directory-service';
import { getOpenSlots } from '../../../services/appointments-service';
import { doctorKeys } from '../../../query-keys';

/** The seeded specialty catalog (`GET /specialties`) — the filter's options. */
export function useSpecialties() {
  return useQuery({
    queryKey: doctorKeys.specialties(),
    queryFn: ({ signal }) => listSpecialties(signal),
    staleTime: 5 * 60_000,
  });
}

/** One page of verified doctors, optionally narrowed to a specialty slug. */
export function usePublicDoctors(specialty?: string | null) {
  return useQuery({
    queryKey: doctorKeys.list(specialty ?? null, null),
    queryFn: ({ signal }) =>
      listPublicDoctors({ specialty: specialty ?? undefined, limit: 20 }, signal),
  });
}

/** Every page of the public directory. Used where a real endpoint carries only
 * a `doctorProfileId` (`/appointments/mine`) and the UI needs a name. */
export function useAllPublicDoctors() {
  return useQuery({
    queryKey: doctorKeys.directory(),
    queryFn: ({ signal }) => listAllPublicDoctors(signal),
    staleTime: 5 * 60_000,
  });
}

/** Resolve `/doctors/:id` against the public list (core has no public
 * single-doctor route yet). `null` is "not in the directory". */
export function usePublicDoctor(doctorId?: string) {
  return useQuery({
    queryKey: doctorKeys.profile(doctorId ?? 'unknown'),
    queryFn: ({ signal }) => getPublicDoctor(doctorId!, signal),
    enabled: Boolean(doctorId),
  });
}

/** The doctor's real, public open future slots. */
export function useDoctorOpenSlots(doctorId?: string) {
  return useQuery({
    queryKey: doctorKeys.slots(doctorId ?? 'unknown'),
    queryFn: ({ signal }) => getOpenSlots(doctorId!, signal),
    enabled: Boolean(doctorId),
  });
}
