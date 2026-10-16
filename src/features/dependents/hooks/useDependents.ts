import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dependentsService from '../../../services/dependents-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DependentInput } from '../../../types/models';

const DEPENDENTS_KEY = ['dependents'] as const;

export function useDependents() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: DEPENDENTS_KEY,
    queryFn: () => dependentsService.listDependents(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useAddDependent() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DependentInput) => dependentsService.addDependent(input, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPENDENTS_KEY }),
  });
}

export function useUpdateDependent() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DependentInput }) =>
      dependentsService.updateDependent(id, input, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPENDENTS_KEY }),
  });
}

export function useSendHandoverInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dependentId, email }: { dependentId: string; email: string }) =>
      dependentsService.sendHandoverInvite(dependentId, email, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPENDENTS_KEY }),
  });
}

export function useResendHandoverInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependentId: string) => dependentsService.resendHandoverInvite(dependentId, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPENDENTS_KEY }),
  });
}
