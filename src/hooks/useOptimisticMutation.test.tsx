import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../components/Toast';
import { useToastStore } from '../store/toast-store';
import { useOptimisticMutation } from './useOptimisticMutation';

interface Item {
  id: string;
  read: boolean;
}

const KEY = ['test', 'items'] as const;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData<Item[]>(KEY, [
    { id: 'a', read: false },
    { id: 'b', read: false },
  ]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  useToastStore.getState().clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOptimisticMutation', () => {
  it('applies the update, then rolls it back and toasts when the request fails', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const error = new Error('Server said no');
    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ success: boolean }, Error, string, Item[]>({
          mutationFn: () => Promise.reject(error),
          queryKey: KEY,
          update: (items, id) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)),
          errorMessage: "Couldn't mark that read.",
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('a');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Item[]>(KEY)?.[0].read).toBe(false);
    expect(screenText()).toContain("Couldn't mark that read.");
  });

  it('restores an empty cache instead of leaving the optimistic value behind', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const emptyKey = ['test', 'empty'] as const;
    queryClient.removeQueries({ queryKey: emptyKey });
    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ success: boolean }, Error, string, Item[]>({
          mutationFn: () => Promise.reject(new Error('nope')),
          queryKey: emptyKey,
          update: () => [{ id: 'a', read: true }],
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('a');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(emptyKey)).toBeUndefined();
  });

  it('refetches the key after success and shows a success toast', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ success: boolean }, Error, string, Item[]>({
          mutationFn: () => Promise.resolve({ success: true }),
          queryKey: KEY,
          update: (items, id) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)),
          successMessage: 'Marked read.',
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('a');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: KEY });
    expect(screenText()).toContain('Marked read.');
  });

  it('can skip the refetch for read receipts', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ success: boolean }, Error, string, Item[]>({
          mutationFn: () => Promise.resolve({ success: true }),
          queryKey: KEY,
          update: (items, id) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)),
          invalidateOnSettle: false,
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('a');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidate).not.toHaveBeenCalled();
  });
});

function screenText(): string {
  return document.body.textContent ?? '';
}
