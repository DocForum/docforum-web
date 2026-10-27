import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationsService from '../../../services/notification-preferences-service';
import { useAuthStore } from '../../../store/auth-store';
import { applyPreferencesUpdate, completePreferences } from '../preferences';
import type {
  NotificationPreferences,
  Role,
  UpdateNotificationPreferencesInput,
} from '../../../types/models';

export function notificationPreferencesKey(userId: string | null | undefined) {
  return ['notifications', 'preferences', userId ?? 'anonymous'] as const;
}

export function useNotificationPreferences() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: notificationPreferencesKey(user?.id),
    queryFn: async ({ signal }) => {
      const stored = await notificationsService.getNotificationPreferences(accessToken!, signal);
      // Role-appropriate defaults fill any type × channel the server didn't
      // return; safety-critical rows are forced on and locked.
      return completePreferences(user!.role, stored);
    },
    enabled: Boolean(accessToken && user),
  });
}

interface MutationContext {
  previous: NotificationPreferences | undefined;
}

/**
 * Save one change optimistically (issue #108): the toggle/quiet-hours value
 * moves immediately, a failed request rolls the whole cached snapshot back,
 * and every outcome refetches the authoritative state.
 */
export function useUpdateNotificationPreferences() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const key = notificationPreferencesKey(user?.id);

  return useMutation<NotificationPreferences, Error, UpdateNotificationPreferencesInput, MutationContext>({
    mutationFn: (input) => notificationsService.updateNotificationPreferences(input, accessToken!),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(key, applyPreferencesUpdate(previous, input));
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (saved) => {
      const role: Role = user?.role ?? 'patient';
      queryClient.setQueryData(key, completePreferences(role, saved));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
