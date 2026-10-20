import { useQuery } from '@tanstack/react-query';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';

export const APPOINTMENTS_KEY = ['appointments', 'mine'] as const;

export function useMyAppointments() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: APPOINTMENTS_KEY,
    queryFn: () => appointmentsService.listMyAppointments(accessToken!),
    enabled: Boolean(accessToken),
  });
}
