import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { MessagePage, SendMessageInput } from '../../../types/models';

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
    // Fallback for when the notification stream is unavailable: poll while
    // the thread is visible (React Query pauses interval refetches in a
    // hidden tab). The stream still delivers the instant update.
    refetchInterval: 30_000,
  });
}

export function useSendMessage(threadId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => messagingService.sendMessage(threadId, input, accessToken!),
    onSuccess: (message) => {
      // Put the confirmed message straight into the page so it doesn't blink
      // out between the optimistic copy and the refetch finishing.
      queryClient.setQueryData<MessagePage>(messagesKey(threadId), (current) => {
        if (!current) return current;
        const withoutDuplicate = current.messages.filter((item) => item.id !== message.id);
        return {
          ...current,
          messages: [...withoutDuplicate, message].sort(
            (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
          ),
        };
      });
      void queryClient.invalidateQueries({ queryKey: messagesKey(threadId) });
    },
  });
}
