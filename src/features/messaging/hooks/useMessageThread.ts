import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@react-query/react';
import { messagingService } from '../../../services/messaging-service';
import type {
  Message,
  MessagePage,
  MessageThread,
  MessageSenderRole,
} from '../../../types/models';

export type MessageStatus = 'sent' | 'sending' | 'failed';

export interface OptimisticMessage extends Message {
  clientId: string;
  status: MessageStatus;
}

export interface UseMessageThreadResult {
  thread: MessageThread | undefined;
  isThreadLoading: boolean;
  threadError: unknown;
  messages: OptimisticMessage[];
  isLoadingHistory: boolean;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  loadOlder: () => void;
  send: (body: string) => void;
  retry: (clientId: string) => void;
  isSending: boolean;
  isClosed: boolean;
  closedAt: string | null;
  draft: string;
  setDraft: (draft: string) => void;
  errorMessage: string | null;
}

const PAGE_SIZE = 25;
const POLL_INTERVAL_MS = 10_000;

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toOptimistic(message: Message): OptimisticMessage {
  return { ...message, clientId: message.id, status: 'sent' };
}

export function useMessageThread(appointmentId: string): UseMessageThreadResult {
  const queryClient = useQueryClient();
  const [appended, setAppended] = useState<OptimisticMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingRef = useRef<Map<string, string>>(new Map());

  const threadQuery = useQuery({
    queryKey: ['messaging', 'thread', appointmentId],
    queryFn: () => messagingService.getThread(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const historyQuery = useInfiniteQuery<MessagePage>({
    queryKey: ['messaging', 'messages', appointmentId],
    enabled: Boolean(appointmentId),
    initialPageParam: { limit: PAGE_SIZE },
    queryFn: ({ pageParam }) =>
      messagingService.listMessages(appointmentId, {
        cursor: pageParam.cursor,
        limit: pageParam.limit,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ? { cursor: lastPage.nextCursor } : undefined,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ body }: { body: string; clientId: string }) =>
      messagingService.sendMessage(appointmentId, { body }),
  });

  const historyMessages = useMemo(() => {
    const pages = historyQuery.data?.pages ?? [];
    const all = pages.flatMap((page) => page.items);
    const byId = new Map<string, Message>();
    for (const m of all) byId.set(m.id, m);
    return Array.from(byId.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
  }, [historyQuery.data]);

  const messages = useMemo(() => {
    const historyIds = new Set(historyMessages.map((m) => m.id));
    const extra = appended.filter((m) => !historyIds.has(m.id));
    return [...historyMessages, ...extra].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
  }, [historyMessages, appended]);

  const mergeServerMessage = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagePage>(
        ['messaging', 'messages', appointmentId],
        (existing) => {
          if (!existing) return existing;
          const pages = existing.pages.map((page, idx) => {
            if (idx !== 0) return page;
            const has = page.items.some((m) => m.id === message.id);
            if (has) return page;
            return { ...page, items: [...page.items, message] };
          });
          return { ...existing, pages };
        },
      );
    },
    [queryClient, appointmentId],
  );

  const dispatchSend = useCallback(
    (clientId: string, body: string) => {
      setErrorMessage(null);
      setAppended((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: 'sending' } : m,
        ),
      );
      sendMutation.mutate(
        { body, clientId },
        {
          onSuccess: (server) => {
            setAppended((prev) => {
              const next = prev.filter((m) => m.clientId !== clientId);
              next.push(toOptimistic(server));
              return next;
            });
            mergeServerMessage(server);
          },
          onError: (error) => {
            setAppended((prev) =>
              prev.map((m) =>
                m.clientId === clientId ? { ...m, status: 'failed' } : m,
              ),
            );
            setErrorMessage(
              error instanceof Error ? error.message : 'Message failed to send.',
            );
          },
        },
      );
    },
    [sendMutation, mergeServerMessage],
  );

  const send = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const clientId = makeClientId();
      const optimistic: OptimisticMessage = {
        id: clientId,
        clientId,
        appointmentId,
        senderId: 'me',
        senderRole: 'patient' as MessageSenderRole,
        body: trimmed,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setAppended((prev) => [...prev, optimistic]);
      pendingRef.current.set(clientId, trimmed);
      dispatchSend(clientId, trimmed);
    },
    [appointmentId, dispatchSend],
  );

  const retry = useCallback(
    (clientId: string) => {
      const body = pendingRef.current.get(clientId);
      if (!body) return;
      dispatchSend(clientId, body);
    },
    [dispatchSend],
  );

  const loadOlder = useCallback(() => {
    if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
      void historyQuery.fetchNextPage();
    }
  }, [historyQuery]);

  const isClosed = Boolean(threadQuery.data?.closedAt);
  const closedAt = threadQuery.data?.closedAt ?? null;

  // Polling fallback while the thread is open and visible.
  useEffect(() => {
    if (isClosed) return undefined;
    if (typeof document === 'undefined') return undefined;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void historyQuery.refetch();
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isClosed, historyQuery]);

  return {
    thread: threadQuery.data,
    isThreadLoading: threadQuery.isLoading,
    threadError: threadQuery.error,
    messages,
    isLoadingHistory: historyQuery.isLoading,
    hasOlder: Boolean(historyQuery.hasNextPage),
    isFetchingOlder: historyQuery.isFetchingNextPage,
    loadOlder,
    send,
    retry,
    isSending: sendMutation.isPending,
    isClosed,
    closedAt,
    draft,
    setDraft,
    errorMessage,
  };
}
