// React Query keys + reads for the appointment detail page (issue #14).
//
// One namespace (`appointments`) so a single prefix can never drift out of
// sync with the nested keys, and so the list, detail and slot reads can each be
// invalidated deliberately — the reschedule flow needs exactly that control
// (see useReschedule: list + detail on success, slots only on 409).
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';

export const appointmentsKeys = {
  all: ['appointments'] as const,
  list: ['appointments', 'list'] as const,
  detail: (appointmentId: string) => ['appointments', 'detail', appointmentId] as const,
  /** Prefix for every doctor's slot list — what a 409 refreshes. */
  slotsRoot: ['appointments', 'slots'] as const,
  slots: (doctorProfileId: string) => ['appointments', 'slots', doctorProfileId] as const,
  doctor: (doctorProfileId: string) => ['appointments', 'doctor', doctorProfileId] as const,
};

/** The real `GET /appointments/mine`.
 * `keepPreviousData`: a refetch must never flash an empty list — the patient
 * always keeps seeing the appointments they already had while a fresh read is
 * in flight (the "never zero appointments mid-reschedule" constraint). */
export function useMyAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: appointmentsKeys.list,
    queryFn: () => appointmentsService.listMyAppointments(accessToken!),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
  });
}

/** Resolves `:id` against the patient's own `/appointments/mine` before
 * anything else runs: `docforum-core` has no `GET /appointments/:id`, and
 * matching locally means a forwarded or guessed id can never surface another
 * patient's appointment — it resolves to `null` and the page says not found.
 * `null` is "not yours / not found", never "you have no appointments". */
export function useAppointmentDetail(appointmentId?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: appointmentsKeys.detail(appointmentId ?? 'unknown'),
    queryFn: async () => {
      const appointments = await appointmentsService.listMyAppointments(accessToken!);
      return appointments.find((appointment) => appointment.id === appointmentId) ?? null;
    },
    enabled: Boolean(appointmentId && accessToken),
  });
}

/** Same doctor's open future slots — the reschedule picker's source. Real
 * endpoint, public by design (no access token needed).
 * `keepPreviousData` matters specifically after a 409: the refresh must not
 * blank the picker into looking like the doctor has no availability. */
export function useOpenSlots(doctorProfileId?: string) {
  return useQuery({
    queryKey: appointmentsKeys.slots(doctorProfileId ?? 'unknown'),
    queryFn: () => appointmentsService.getOpenSlots(doctorProfileId!),
    enabled: Boolean(doctorProfileId),
    placeholderData: keepPreviousData,
  });
}

/** ASSUMED clinician read (docforum-core#23) — `/appointments/mine` carries
 * only `doctorProfileId`. `retry: false` because the expected answer today is
 * a 404 from a route that does not exist yet, and retrying a contract gap
 * three times is just three wasted requests. */
export function useClinician(doctorProfileId?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: appointmentsKeys.doctor(doctorProfileId ?? 'unknown'),
    queryFn: () => appointmentsService.getDoctorProfile(doctorProfileId!, accessToken!),
    enabled: Boolean(doctorProfileId && accessToken),
    retry: false,
  });
}
