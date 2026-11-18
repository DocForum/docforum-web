import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { SendMessageInput } from '../../../types/models';

export function messagesKey(threadId: string) {
  return ['messages', threadId] as const;
}

export function useThread(threadId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: ({ signal }) => messagingService.getThread(threadId, accessToken!, signal),
    enabled: Boolean(threadId && accessToken),
  });
}

export function useMessages(threadId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: messagesKey(threadId ?? ''),
    queryFn: ({ signal }) => messagingService.listMessages(threadId!, null, accessToken!, signal),
    enabled: Boolean(threadId && accessToken),
  });
}

export function useSendMessage(threadId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => messagingService.sendMessage(threadId, input, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey(threadId) });
    },
  });
}
