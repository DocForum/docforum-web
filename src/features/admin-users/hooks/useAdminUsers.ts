import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminUsersService from '../../../services/admin-users-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { adminUserKeys } from '../../../query-keys';
import type {
  AdminUser,
  AdminUserQuery,
  DeactivateAdminUserInput,
  SendAdminInviteInput,
} from '../../../types/models';


function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useAdminUsers(query: AdminUserQuery) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: adminUserKeys.page(query),
    queryFn: ({ signal }) => adminUsersService.listAdminUsers(query, accessToken!, signal),
    enabled: Boolean(accessToken),
    // Keep the previous page on screen while the next one loads, so the table
    // never collapses to an empty frame on pagination.
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useDeactivateAdminUser(userId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<AdminUser, Error, DeactivateAdminUserInput>({
    mutationFn: (input) => adminUsersService.deactivateAdminUser(userId, input, accessToken!),
    onSuccess: async (user) => {
      queryClient.setQueryData(adminUserKeys.detail(userId), user);
      await invalidateFor(queryClient, 'admin.user.write', userId);
    },
  });
}

export function useReactivateAdminUser(userId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<AdminUser, Error, void>({
    mutationFn: () => adminUsersService.reactivateAdminUser(userId, accessToken!),
    onSuccess: async (user) => {
      queryClient.setQueryData(adminUserKeys.detail(userId), user);
      await invalidateFor(queryClient, 'admin.user.write', userId);
    },
  });
}

export function useAdminInvites() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: adminUserKeys.invites(),
    queryFn: ({ signal }) => adminUsersService.listAdminInvites(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export function useSendAdminInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendAdminInviteInput) => adminUsersService.sendAdminInvite(input, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'admin.invites.write'),
  });
}

export function useRevokeAdminInvite() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => adminUsersService.revokeAdminInvite(inviteId, accessToken!),
    onSuccess: () => invalidateFor(queryClient, 'admin.invites.write'),
  });
}
