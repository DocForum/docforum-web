import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as availabilityService from '../../../services/availability-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { isoDatesBetween, slotsInTimeRange, sortByStartTime } from '../calendar';
import { doctorSlotsKey } from './useAvailabilitySlots';
import type { IsoDate } from '../calendar';
import type { AvailabilitySlot, BlockRangeResult, SlotGenerationResult } from '../../../types/models';

interface WindowSnapshot {
  key: QueryKey;
  slots: AvailabilitySlot[] | undefined;
}

interface OptimisticContext {
  windows: WindowSnapshot[];
}

/** Every cached window for this doctor, captured BEFORE an optimistic write —
 * that snapshot is the rollback target. */
function readWindows(queryClient: ReturnType<typeof useQueryClient>, doctorProfileId: string): WindowSnapshot[] {
  return queryClient
    .getQueriesData<AvailabilitySlot[]>({ queryKey: doctorSlotsKey(doctorProfileId) })
    .map(([key, slots]) => ({ key, slots }));
}

function writeWindows(
  queryClient: ReturnType<typeof useQueryClient>,
  windows: readonly WindowSnapshot[],
  transform: (slots: AvailabilitySlot[]) => AvailabilitySlot[],
): void {
  for (const window of windows) {
    if (window.slots) queryClient.setQueryData(window.key, transform(window.slots));
  }
}

function restoreWindows(queryClient: ReturnType<typeof useQueryClient>, windows: readonly WindowSnapshot[]): void {
  for (const window of windows) queryClient.setQueryData(window.key, window.slots);
}

function markHeld(slots: AvailabilitySlot[], slotIds: ReadonlySet<string>): AvailabilitySlot[] {
  return slots.map((slot) => (slotIds.has(slot.id) && slot.status === 'open' ? { ...slot, status: 'held' as const } : slot));
}

function markOpen(slots: AvailabilitySlot[], slotId: string): AvailabilitySlot[] {
  return slots.map((slot) => (slot.id === slotId && slot.status === 'held' ? { ...slot, status: 'open' as const } : slot));
}

function dropSlots(slots: AvailabilitySlot[], slotIds: ReadonlySet<string>): AvailabilitySlot[] {
  return slots.filter((slot) => !slotIds.has(slot.id));
}

function mergeGeneratedSlots(
  queryClient: ReturnType<typeof useQueryClient>,
  doctorProfileId: string,
  created: AvailabilitySlot[],
): void {
  if (created.length === 0) return;
  for (const window of readWindows(queryClient, doctorProfileId)) {
    if (!window.slots) continue;
    const known = new Set(window.slots.map((slot) => slot.id));
    const additions = created.filter((slot) => !known.has(slot.id));
    if (additions.length > 0) {
      queryClient.setQueryData(window.key, sortByStartTime([...window.slots, ...additions]));
    }
  }
}

/** Explains a rolled-back edit without blaming the doctor: the common `409`
 * here is a patient booking the slot mid-decision, not a mistake at the
 * keyboard. */
export function rollbackMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    const server = error.message.trim() || 'That slot could not be changed.';
    return `${server} Someone else changed the slot while you were working — the calendar has been restored and nothing was cancelled.`;
  }
  if (error instanceof ApiError && error.message.trim()) return `${error.message} The calendar has been restored.`;
  return 'The change could not be saved. The calendar has been restored.';
}

export interface BlockRangeVariables {
  startTime: string;
  endTime: string;
  reason?: string;
}

export function useBlockSlotRange(doctorProfileId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<BlockRangeResult, Error, BlockRangeVariables, OptimisticContext>({
    mutationFn: (input) =>
      availabilityService.blockSlotRange(
        { startTime: input.startTime, endTime: input.endTime, reason: input.reason },
        accessToken!,
      ),
    onMutate: async (input) => {
      if (!doctorProfileId) return { windows: [] };
      await queryClient.cancelQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
      const windows = readWindows(queryClient, doctorProfileId);
      // The endpoint takes a range, so everything open inside it is affected —
      // including slots the drag passed over without selecting.
      const inside = slotsInTimeRange(
        windows.flatMap((window) => window.slots ?? []),
        { startTime: input.startTime, endTime: input.endTime },
      );
      const affected = new Set(inside.filter((slot) => slot.status === 'open').map((slot) => slot.id));
      writeWindows(queryClient, windows, (slots) => markHeld(slots, affected));
      return { windows };
    },
    onSuccess: (result, _variables, context) => {
      if (!doctorProfileId) return;
      // Undo the guess first, then apply exactly the ids the server reports —
      // otherwise a slot the server refused to block would stay blocked on
      // screen as a ghost.
      if (context) restoreWindows(queryClient, context.windows);
      const blocked = new Set(result.blockedSlotIds);
      writeWindows(queryClient, readWindows(queryClient, doctorProfileId), (slots) => markHeld(slots, blocked));
    },
    onError: (_error, _variables, context) => {
      if (context) restoreWindows(queryClient, context.windows);
    },
    onSettled: () => {
      if (doctorProfileId) queryClient.invalidateQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
    },
  });
}

export interface RemoveSlotsResult {
  removedCount: number;
}

export function useRemoveSlots(doctorProfileId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<RemoveSlotsResult, Error, string[], OptimisticContext>({
    mutationFn: async (slotIds) => {
      const conflicts: string[] = [];
      let removed = 0;
      for (const slotId of slotIds) {
        try {
          await availabilityService.removeSlot(slotId, accessToken!);
          removed += 1;
        } catch (error) {
          // Keep going: a single already-booked slot should not strand the rest
          // of the selection, but the batch must still surface as a conflict so
          // the cache gets rolled back.
          if (error instanceof ApiError && error.status === 409) conflicts.push(error.message.trim());
          else throw error;
        }
      }
      if (conflicts.length > 0) {
        throw new ApiError(
          `${conflicts[0] || 'One of the selected slots is no longer open.'} (${removed} of ${slotIds.length} selected slots were removed.)`,
          409,
        );
      }
      return { removedCount: slotIds.length };
    },
    onMutate: async (slotIds) => {
      if (!doctorProfileId) return { windows: [] };
      await queryClient.cancelQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
      const windows = readWindows(queryClient, doctorProfileId);
      const ids = new Set(slotIds);
      writeWindows(queryClient, windows, (slots) => dropSlots(slots, ids));
      return { windows };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreWindows(queryClient, context.windows);
    },
    onSettled: () => {
      if (doctorProfileId) queryClient.invalidateQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
    },
  });
}

export function useUnblockSlot(doctorProfileId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, OptimisticContext>({
    mutationFn: (slotId) => availabilityService.unblockSlot(slotId, accessToken!),
    onMutate: async (slotId) => {
      if (!doctorProfileId) return { windows: [] };
      await queryClient.cancelQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
      const windows = readWindows(queryClient, doctorProfileId);
      writeWindows(queryClient, windows, (slots) => markOpen(slots, slotId));
      return { windows };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreWindows(queryClient, context.windows);
    },
    onSettled: () => {
      if (doctorProfileId) queryClient.invalidateQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
    },
  });
}

export interface GenerateSlotsVariables {
  fromDate: IsoDate;
  toDate: IsoDate;
  startHour: number;
  endHour: number;
  slotLengthMinutes: number;
  timeZone: string;
}

export interface GenerateSlotsOutcome {
  created: number;
  skipped: number;
  requestedDays: number;
  failedDays: { date: IsoDate; message: string }[];
}

/** The real generate endpoint is single-day (core has no recurrence engine), so
 * a range is one request per day, fired sequentially and aggregated here. */
export function useGenerateSlots(doctorProfileId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<GenerateSlotsOutcome, Error, GenerateSlotsVariables>({
    mutationFn: async (input) => {
      const dates = isoDatesBetween(input.fromDate, input.toDate);
      const failures: { date: IsoDate; message: string }[] = [];
      const aggregate: Omit<SlotGenerationResult, 'slots'> = { created: 0, skipped: 0 };
      for (const date of dates) {
        try {
          const result = await availabilityService.generateSlots(
            doctorProfileId!,
            {
              date,
              startHour: input.startHour,
              endHour: input.endHour,
              slotLengthMinutes: input.slotLengthMinutes,
            },
            accessToken!,
          );
          aggregate.created += result.created;
          aggregate.skipped += result.skipped;
          mergeGeneratedSlots(queryClient, doctorProfileId!, result.slots);
        } catch (error) {
          failures.push({ date, message: error instanceof Error ? error.message : 'The request failed.' });
        }
      }
      return { ...aggregate, requestedDays: dates.length, failedDays: failures };
    },
    onSettled: () => {
      if (doctorProfileId) queryClient.invalidateQueries({ queryKey: doctorSlotsKey(doctorProfileId) });
    },
  });
}
