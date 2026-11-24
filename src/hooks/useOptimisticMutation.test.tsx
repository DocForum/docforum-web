import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient } from '../test/render';
import { useToastStore } from '../store/toast-store';
import { optimisticHandlers, useOptimisticMutation } from './useOptimisticMutation';

const key = ['todos'] as const;
type Todos = { id: string; done: boolean }[];
const toggle = (current: Todos | undefined, id: string) =>
  current?.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));

function setup() {
  const queryClient = createQueryClient();
  queryClient.setQueryData<Todos>(key, [{ id: 'a', done: false }]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useOptimisticMutation', () => {
  it('applies the change before the server answers, and keeps it on success', async () => {
    const { queryClient, wrapper } = setup();
    let resolve!: (value: string) => void;
    const mutationFn = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const { result } = renderHook(
      () => useOptimisticMutation<string, string, Todos>({ queryKey: key, mutationFn, apply: toggle, errorMessage: 'x' }),
      { wrapper },
    );

    act(() => result.current.mutate('a'));
    await waitFor(() => expect(queryClient.getQueryData<Todos>(key)).toEqual([{ id: 'a', done: true }]));

    await act(async () => resolve('ok'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('rolls back exactly and shows an error toast on failure', async () => {
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () =>
        useOptimisticMutation<string, string, Todos>({
          queryKey: key,
          mutationFn: () => Promise.reject(new Error('500')),
          apply: toggle,
          errorMessage: (_error, id) => `Couldn't update ${id}.`,
          invalidate: false,
        }),
      { wrapper },
    );

    act(() => result.current.mutate('a'));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<Todos>(key)).toEqual([{ id: 'a', done: false }]);
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ tone: 'error', message: "Couldn't update a." }),
    ]);
  });
});

describe('optimisticHandlers', () => {
  it('cancels in-flight refetches before writing, and invalidates when settled', async () => {
    const { queryClient } = setup();
    const cancel = vi.spyOn(queryClient, 'cancelQueries');
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const handlers = optimisticHandlers<string, string, Todos>(queryClient, {
      queryKey: key,
      mutationFn: async () => 'ok',
      apply: toggle,
      errorMessage: 'x',
    });

    const context = await handlers.onMutate('a');
    expect(cancel).toHaveBeenCalledWith({ queryKey: key });
    expect(context.previous).toEqual([{ id: 'a', done: false }]);

    handlers.onSettled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });

  it('leaves the cache alone when apply returns undefined (nothing cached yet)', async () => {
    const queryClient = createQueryClient();
    const handlers = optimisticHandlers<string, string, Todos>(queryClient, {
      queryKey: key,
      mutationFn: async () => 'ok',
      apply: toggle,
      errorMessage: 'x',
    });
    await handlers.onMutate('a');
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});
