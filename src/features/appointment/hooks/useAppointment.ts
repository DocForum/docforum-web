import { useQuery } from '@tanstack/react-query';
import * as appointmentService from '../../../services/appointment-service';
import { useAuthStore } from '../../../store/auth-store';
import { appointmentKeys } from '../../../query-keys';
import type { Appointment } from '../../../types/models';

export function useAppointment(appointmentId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Appointment>({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => appointmentService.getAppointmentById(appointmentId, accessToken!),
    enabled: Boolean(accessToken && appointmentId),
  });
}
