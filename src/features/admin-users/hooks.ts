import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersService } from '../../services/admin-users-service';
import type { AdminUserListParams } from '../../types/admin-users';

const usersKey = ['admin', 'users'] as const;
const invitesKey = ['admin', 'invites'] as const;

interface ReasonVars {
  id: string;
  reason: string;
}

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: [...usersKey, 'list', params],
    queryFn: () => adminUsersService.listUsers(params),
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: [...usersKey, 'detail', id],
    queryFn: () => adminUsersService.getUser(id as string),
    enabled: id !== null,
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonVars) => adminUsersService.deactivateUser(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonVars) => adminUsersService.reactivateUser(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useAdminInvites() {
  return useQuery({
    queryKey: invitesKey,
    queryFn: () => adminUsersService.listInvites(),
  });
}

export function useSendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => adminUsersService.sendInvite(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersService.revokeInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });
}