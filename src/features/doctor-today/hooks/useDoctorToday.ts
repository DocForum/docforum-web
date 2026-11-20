import { useQuery } from '@tanstack/react-query';
import * as doctorTodayService from '../../../services/doctor-today-service';
import * as queueService from '../../../services/queue-service';
import { useAuthStore } from '../../../store/auth-store';

export function useTodayAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['doctor', 'appointments', 'today'],
    queryFn: ({ signal }) => queueService.listTodayAppointments(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useAppointmentIntake(appointmentId: string, enabled: boolean) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['doctor', 'appointments', appointmentId, 'intake'],
    queryFn: ({ signal }) => doctorTodayService.getAppointmentIntake(appointmentId, accessToken!, signal),
    enabled: Boolean(accessToken && appointmentId && enabled),
  });
}
