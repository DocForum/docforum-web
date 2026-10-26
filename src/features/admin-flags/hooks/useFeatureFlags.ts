import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import * as flagsService from '../../../services/feature-flags-service';
import * as auditService from '../../../services/audit-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { flagKeys } from '../../../query-keys';
import { applyUpdate } from '../draft';
import { FLAG_ENTITY_TYPE } from '../flags';
import type { FeatureFlag, UpdateFeatureFlagInput } from '../../../types/models';

// Sibling keys, not nested ones: invalidating the list mustn't also cancel
// or refetch the audit lookup, and vice versa.
export const FLAGS_KEY = flagKeys.list();
const HISTORY_KEY = flagKeys.history();
const UPDATE_KEY = ['admin', 'flags', 'update'] as const;

// The most the audit listing serves in one page (docforum-core#43).
export const HISTORY_LIMIT = 200;

// A 4xx won't fix itself on retry — only retry network/5xx failures.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useFeatureFlags() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: FLAGS_KEY,
    queryFn: ({ signal }) => flagsService.listFeatureFlags(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

/** The latest page of flag audit events, for "last changed by … when". One
 * request for all flags rather than one per flag. */
export function useFlagHistory() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: ({ signal }) =>
      auditService.listAuditEvents({ entityType: FLAG_ENTITY_TYPE, limit: HISTORY_LIMIT }, accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export interface UpdateFlagVariables {
  /** The flag as the admin saw it when they confirmed. */
  flag: FeatureFlag;
  input: UpdateFeatureFlagInput;
}

interface RollbackContext {
  previous: FeatureFlag;
}

function replaceFlag(flags: FeatureFlag[] | undefined, next: FeatureFlag): FeatureFlag[] | undefined {
  return flags?.map((flag) => (flag.key === next.key ? next : flag));
}

/**
 * Saves a flag change optimistically: the list shows the new state as soon
 * as the admin confirms, and a failure puts that one flag back.
 *
 * Rollback is per flag, not a snapshot of the whole list — restoring a
 * snapshot would also undo a change to a *different* flag that's still in
 * flight or already saved. And it only applies while the cached flag still
 * carries the `updatedAt` we started from: the optimistic copy keeps it, so
 * if anything newer from the server has landed since, that wins.
 */
export function useUpdateFeatureFlag() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<FeatureFlag, Error, UpdateFlagVariables, RollbackContext>({
    mutationKey: UPDATE_KEY,
    mutationFn: ({ flag, input }) => flagsService.updateFeatureFlag(flag.key, input, accessToken!),
    onMutate: async ({ flag, input }) => {
      // A list fetch landing mid-save would overwrite the optimistic entry
      // with the pre-save state.
      await queryClient.cancelQueries({ queryKey: FLAGS_KEY });
      queryClient.setQueryData<FeatureFlag[]>(FLAGS_KEY, (flags) => replaceFlag(flags, applyUpdate(flag, input)));
      return { previous: flag };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      const { previous } = context;
      queryClient.setQueryData<FeatureFlag[]>(FLAGS_KEY, (flags) =>
        flags?.map((flag) => (flag.key === previous.key && flag.updatedAt === previous.updatedAt ? previous : flag)),
      );
    },
    onSuccess: (saved) => {
      if (saved?.key) queryClient.setQueryData<FeatureFlag[]>(FLAGS_KEY, (flags) => replaceFlag(flags, saved));
    },
    // Success or not, re-read the truth: after a conflict or a lost response
    // the server's state is the only one worth showing, and the audit trail
    // has a new "last changed" entry when the save went through. Not awaited
    // — a slow (cold-start) refetch mustn't hold the flag in "Saving…".
    onSettled: () => {
      void invalidateFor(queryClient, 'admin.feature-flags.write');
    },
  });
}

/** Keys of flags with a save in flight, across every caller. Their
 * controls stay disabled so two edits to one flag can't race. */
export function useSavingFlagKeys(): Set<string> {
  const keys = useMutationState({
    filters: { mutationKey: UPDATE_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as UpdateFlagVariables | undefined)?.flag.key,
  });
  return new Set(keys.filter((key): key is string => Boolean(key)));
}
