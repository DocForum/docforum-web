import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as bookingService from '../../../services/booking-service';
import { useAuthStore } from '../../../store/auth-store';
import { appointmentKeys } from '../../../query-keys';
import { invalidateFor } from '../../../invalidations';
import type { CreateBookingInput } from '../../../types/models';

export function useDoctorSlots(doctorId: string, windowStart?: string, windowEnd?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: appointmentKeys.doctorSlots(doctorId),
    queryFn: ({ signal }) =>
      bookingService.listDoctorSlots(doctorId, accessToken!, windowStart, windowEnd, signal),
    enabled: Boolean(accessToken && doctorId),
  });
}

export function useCreateBooking() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingService.createBooking(input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'booking.create'),
  });
}
