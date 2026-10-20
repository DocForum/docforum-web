import { useQuery } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import { appointmentKeys } from '../../../query-keys';

export const APPOINTMENTS_KEY = appointmentKeys.mine();

export function useMyAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: APPOINTMENTS_KEY,
    queryFn: ({ signal }) => appointmentsService.listMyAppointments(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}
