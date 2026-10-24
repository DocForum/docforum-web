import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from '../store/toast-store';

export interface OptimisticMutationOptions<TData, TError extends Error, TVariables, TQueryData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Cache entry to update optimistically. A function derives it per call. */
  queryKey: QueryKey | ((variables: TVariables) => QueryKey);
  /** Pure update applied to the cached value before the request finishes. */
  update: (current: TQueryData | undefined, variables: TVariables) => TQueryData | undefined;
  mutationKey?: QueryKey;
  /** Extra keys to refetch after success or failure (e.g. a list + a badge). */
  invalidateKeys?: QueryKey[];
  /** Set false when the optimistic value is the final truth (e.g. a read
   * receipt) and refetching would only flicker stale data back in. */
  invalidateOnSettle?: boolean;
  successMessage?: string | ((data: TData, variables: TVariables) => string | null);
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
}

/**
 * Optimistic React Query mutation with per-call rollback and a toast on
 * failure.
 *
 * Only use this for mutations whose effect is safe to show before the server
 * confirms — marking a thread read, toggling a preference, accepting a
 * queue action. **Never use it for money movements** (payment intent
 * funding/release/refund): those must show the server's result, because an
 * optimistic "released" that rolls back is a lie about someone's money.
 *
 * Rollback restores the exact snapshot taken in `onMutate`, so mutations
 * that can land concurrently on one cache entry must either be serialised
 * or implement their own narrower rollback (see feature flags).
 */
export function useOptimisticMutation<TData, TError extends Error, TVariables, TQueryData = unknown>(
  options: OptimisticMutationOptions<TData, TError, TVariables, TQueryData>,
) {
  const queryClient = useQueryClient();
  const resolveKey = (variables: TVariables): QueryKey =>
    typeof options.queryKey === 'function' ? options.queryKey(variables) : options.queryKey;

  return useMutation<TData, TError, TVariables, { previous: TQueryData | undefined; key: QueryKey }>({
    mutationKey: options.mutationKey,
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      const key = resolveKey(variables);
      // A fetch landing mid-save would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TQueryData>(key);

      queryClient.setQueryData<TQueryData>(key, (current) => options.update(current, variables));
      return { previous, key };
    },
    onError: (error, variables, context) => {
      // `undefined` is a legitimate snapshot (the entry was empty).
      // setQueryData treats undefined as a no-op, so remove the entry instead
      // of leaving the optimistic value behind.
      if (context) {
        if (context.previous === undefined) {
          queryClient.removeQueries({ queryKey: context.key, exact: true });
        } else {
          queryClient.setQueryData<TQueryData>(context.key, context.previous);
        }
      }
      const message =
        typeof options.errorMessage === 'function'
          ? options.errorMessage(error, variables)
          : options.errorMessage ?? defaultErrorMessage(error);
      toast.error(message);
      options.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      const message =
        typeof options.successMessage === 'function'
          ? options.successMessage(data, variables)
          : options.successMessage;
      if (message) toast.success(message);
      options.onSuccess?.(data, variables);
    },
    onSettled: (_data, _error, variables) => {
      if (options.invalidateOnSettle !== false) {
        void queryClient.invalidateQueries({ queryKey: resolveKey(variables) });
      }
      for (const key of options.invalidateKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

function defaultErrorMessage(error: Error): string {
  return error.message || 'That change could not be saved. Please try again.';
}
