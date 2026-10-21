import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import * as messagingService from '../../../services/messaging-service';
import { useMessageThreads } from './useMessageThreads';
import type { DoctorMessageThread } from '../../../types/models';

vi.mock('../../../services/messaging-service', () => ({
  listThreads: vi.fn(),
  markThreadRead: vi.fn(),
  totalUnread: (threads: DoctorMessageThread[]) =>
    threads.reduce((sum, t) => sum + t.unreadCount, 0),
}));

const THREAD: DoctorMessageThread = {
  id: 'thread-1',
  patientProfileId: 'pat-1',
  patientName: 'Ada Patient',
  lastMessageAt: '2026-01-01T09:00:00Z',
  unreadCount: 2,
  lastPreview: 'I have a question about my results',
  waitingMinutes: 45,
  closingSoon: false,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useMessageThreads', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(messagingService.listThreads).mockReset();
    vi.mocked(messagingService.markThreadRead).mockReset();
  });

  it('returns threads, total unread, and hasMore from the first page', async () => {
    vi.mocked(messagingService.listThreads).mockResolvedValue({
      threads: [THREAD],
      nextCursor: 'cursor-2',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useMessageThreads({ filter: 'all', cursor: null, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([THREAD]);
    expect(result.current.totalUnread).toBe(2);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBe('cursor-2');
    expect(vi.mocked(messagingService.listThreads)).toHaveBeenCalledWith(
      { filter: 'all', cursor: null, limit: 10 },
      'test-token',
      expect.any(AbortSignal),
    );
  });

  it('marks a thread read and clears its unread count optimistically', async () => {
    vi.mocked(messagingService.listThreads).mockResolvedValue({
      threads: [THREAD],
      nextCursor: null,
    });
    vi.mocked(messagingService.markThreadRead).mockResolvedValue(undefined);

    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(
      () => useMessageThreads({ filter: 'all', cursor: null, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.markRead.mutate).toBe('function');

    await result.current.markRead.mutateAsync('thread-1');
    await waitFor(() => {
      const cached = (
        queryClient.getQueryData([
          'doctor',
          'messages',
          'threads',
          'all',
          null,
          10,
        ]) as { threads: DoctorMessageThread[] } | undefined
      )?.threads?.[0].unreadCount;
      expect(cached).toBe(0);
    });
    expect(vi.mocked(messagingService.markThreadRead)).toHaveBeenCalledWith(
      'thread-1',
      'test-token',
    );
    expect(
      (
        queryClient.getQueryData([
          'doctor',
          'messages',
          'threads',
          'all',
          null,
          10,
        ]) as { threads: DoctorMessageThread[] } | undefined
      )?.threads?.[0].unreadCount,
    ).toBe(0);
  });

  it('fetchMore returns the next page', async () => {
    vi.mocked(messagingService.listThreads)
      .mockResolvedValueOnce({ threads: [THREAD], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({
        threads: [{ ...THREAD, id: 'thread-2', unreadCount: 0 }],
        nextCursor: null,
      });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useMessageThreads({ filter: 'all', cursor: null, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const next = await result.current.fetchMore();
    expect(next?.threads).toHaveLength(1);
    expect(next?.threads?.[0].id).toBe('thread-2');
  });
});
