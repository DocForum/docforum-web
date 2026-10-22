import { useQuery } from '@tanstack/react-query';
import * as appointmentService from '../../../services/appointment-service';
import { useAuthStore } from '../../../store/auth-store';
import { appointmentKeys } from '../../../query-keys';
import type { Appointment } from '../../../types/models';

export function useAppointment(appointmentId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Appointment>({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: ({ signal }) => appointmentService.getAppointmentById(appointmentId, accessToken!, signal),
    enabled: Boolean(accessToken && appointmentId),
  });
}
