import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookAppointment, createIntake } from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { invalidateFor } from '../../../invalidations';
import type { BookAppointmentInput, CreateIntakeInput } from '../../../types/models';

/** Structured intake write (`POST /intake`, real). */
export function useCreateIntake() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (input: CreateIntakeInput) => createIntake(input, accessToken!),
  });
}

/** The booking write (`POST /appointments`, real). A 409 is surfaced as-is to
 * the caller so BookingFlow can explain that the slot was taken instead of
 * showing a generic failure. */
export function useBookAppointment() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedProfileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    // The acting profile is read at mutation time, not at render time, so
    // switching mid-flow can never book for the previous profile.
    mutationFn: (input: BookAppointmentInput) =>
      bookAppointment(
        { ...input, patientProfileId: input.patientProfileId ?? selectedProfileId ?? undefined },
        accessToken!,
      ),
    onSuccess: () => {
      // Every availability view no longer offers this slot, and the patient's
      // appointment list has one more row.
      void invalidateFor(queryClient, 'appointments.book');
    },
  });
}

/** The patient profile the booking should be written for: the acting profile,
 * or undefined (self) when none has been bootstrapped. */
export function useBookingProfileId(): string | undefined {
  return useProfileStore((state) => state.selectedProfileId) ?? undefined;
}
