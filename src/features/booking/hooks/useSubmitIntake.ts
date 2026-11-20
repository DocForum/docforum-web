import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as intakeService from '../../../services/intake-service';
import { useAuthStore } from '../../../store/auth-store';
import type { SubmitIntakeInput } from '../../../types/models';

export function useSubmitIntake(appointmentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitIntakeInput) =>
      intakeService.submitIntake(appointmentId, input, accessToken!),
    onSuccess: () => {
      // The appointment detail reads `intake` from `/appointments/mine`, so
      // refetch it once the submission exists.
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
