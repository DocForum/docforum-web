// Optimistic React Query mutations with rollback and an error toast
// (issue #113).
//
// WHICH MUTATIONS QUALIFY — read before using this:
//   ✓ Reversible UI state the server will almost certainly accept, where a
//     wrong guess is harmless once rolled back: marking notifications or
//     threads read, toggles, reordering, dismissing a card.
//   ✗ NEVER money movement or anything escrow-related: payment intents,
//     wallet payments, payouts, refunds, disputes that release funds. The UI
//     must show what the ledger actually did, never what we hoped it would
//     do. `src/hooks/optimistic-policy.test.ts` fails CI if this helper (or
//     a hand-written `onMutate`) appears under `src/features/payments/`.
//   ✗ Form submissions where the server validates input (booking, sign-up):
//     show the server's answer next to the form instead.
// The list is kept in ARCHITECTURE_ESSENTIALS.md ("Mutation feedback").
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import { showToast } from '../store/toast-store';

export interface OptimisticMutationOptions<TData, TVariables, TCache> {
  /** The cache entry the optimistic write targets. */
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Pure: the cache as it should look if the mutation succeeds. Return
   * `undefined` to leave the cache untouched (e.g. nothing cached yet). */
  apply: (current: TCache | undefined, variables: TVariables) => TCache | undefined;
  /** Already-translated copy for the error toast shown after rollback. */
  errorMessage: string | ((error: unknown, variables: TVariables) => string);
  /** Reconcile the cache with the server's answer. */
  onSuccess?: (data: TData, variables: TVariables, queryClient: QueryClient) => void;
  /** Runs right after the optimistic write (e.g. tell other tabs). */
  onApplied?: (next: TCache | undefined, variables: TVariables) => void;
  /** Refetch `queryKey` once settled so the server stays the source of
   * truth. Default true. */
  invalidate?: boolean;
}

export interface OptimisticContext<TCache> {
  previous: TCache | undefined;
}

/**
 * The mutation lifecycle as plain callbacks, so it can be tested without
 * rendering and reused by `useOptimisticMutation`.
 */
export function optimisticHandlers<TData, TVariables, TCache>(
  queryClient: QueryClient,
  options: OptimisticMutationOptions<TData, TVariables, TCache>,
) {
  const { queryKey, apply, errorMessage, onSuccess, onApplied, invalidate = true } = options;
  return {
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TCache>> => {
      // Stop an in-flight refetch from overwriting the optimistic value.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TCache>(queryKey);
      const next = apply(previous, variables);
      if (next !== undefined) queryClient.setQueryData<TCache>(queryKey, next);
      onApplied?.(next, variables);
      return { previous };
    },
    onError: (error: unknown, variables: TVariables, context: OptimisticContext<TCache> | undefined) => {
      // Roll back to exactly what the user saw before the optimistic write.
      if (context && context.previous !== undefined) {
        queryClient.setQueryData<TCache>(queryKey, context.previous);
      }
      showToast({
        tone: 'error',
        message: typeof errorMessage === 'function' ? errorMessage(error, variables) : errorMessage,
      });
    },
    onSuccess: (data: TData, variables: TVariables) => {
      onSuccess?.(data, variables, queryClient);
    },
    onSettled: () => {
      if (invalidate) void queryClient.invalidateQueries({ queryKey });
    },
  };
}

export function useOptimisticMutation<TData, TVariables = void, TCache = unknown>(
  options: OptimisticMutationOptions<TData, TVariables, TCache>,
): UseMutationResult<TData, unknown, TVariables, OptimisticContext<TCache>> {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVariables, OptimisticContext<TCache>>({
    mutationFn: options.mutationFn,
    ...optimisticHandlers(queryClient, options),
  });
}
