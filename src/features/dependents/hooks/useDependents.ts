import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dependentsService from '../../../services/dependents-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { dependentKeys } from '../../../query-keys';
import type { DependentInput } from '../../../types/models';

export function useDependents() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: dependentKeys.all,
    queryFn: ({ signal }) => dependentsService.listDependents(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useAddDependent() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DependentInput) => dependentsService.addDependent(input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'dependents.write'),
  });
}

export function useUpdateDependent() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DependentInput }) =>
      dependentsService.updateDependent(id, input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'dependents.write'),
  });
}

export function useSendHandoverInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dependentId, email }: { dependentId: string; email: string }) =>
      dependentsService.sendHandoverInvite(dependentId, email, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'dependents.write'),
  });
}

export function useResendHandoverInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependentId: string) => dependentsService.resendHandoverInvite(dependentId, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'dependents.write'),
  });
}
