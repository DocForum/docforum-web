import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '../../../test/render';
import * as availabilityService from '../../../services/availability-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { slotsWindowKey } from './useAvailabilitySlots';
import {
  rollbackMessage,
  useBlockSlotRange,
  useGenerateSlots,
  useRemoveSlots,
  useUnblockSlot,
} from './useSlotManagement';
import type { AvailabilitySlot } from '../../../types/models';

vi.mock('../../../services/availability-service');

const DOCTOR = 'doctor-1';
const WINDOW = { from: '2026-10-11T23:00:00.000Z', to: '2026-10-18T23:00:00.000Z' };
const AFTERNOON = { startTime: '2026-10-12T12:00:00.000Z', endTime: '2026-10-12T17:00:00.000Z' };

function slot(
  id: string,
  status: AvailabilitySlot['status'],
  overrides: Partial<AvailabilitySlot> = {},
): AvailabilitySlot {
  return {
    id,
    doctorProfileId: DOCTOR,
    status,
    startTime: '2026-10-12T13:00:00.000Z',
    endTime: '2026-10-12T13:30:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderMutation<THooks>(run: () => THooks, queryClient: QueryClient) {
  return renderHook(run, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe('blocking a range', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    queryClient = createQueryClient();
    vi.mocked(availabilityService.listMySlots).mockReset();
    vi.mocked(availabilityService.blockSlotRange).mockReset();
  });

  function seed(slots: AvailabilitySlot[]) {
    queryClient.setQueryData(slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to), slots);
  }

  function read(): AvailabilitySlot[] | undefined {
    return queryClient.getQueryData<AvailabilitySlot[]>(slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to));
  }

  it('marks the open slots in the range as blocked before the server answers', async () => {
    const pending = deferred<{ blockedSlotIds: string[]; conflicts: [] }>();
    vi.mocked(availabilityService.blockSlotRange).mockReturnValue(pending.promise);
    seed([slot('s1', 'open'), slot('s2', 'booked')]);

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate(AFTERNOON);

    await waitFor(() => expect(read()?.find((entry) => entry.id === 's1')?.status).toBe('held'));
    expect(availabilityService.blockSlotRange).toHaveBeenCalledTimes(1);
    pending.resolve({ blockedSlotIds: ['s1'], conflicts: [] });
  });

  it('leaves booked appointments in the range untouched by the optimistic write', async () => {
    const pending = deferred<{ blockedSlotIds: string[]; conflicts: [] }>();
    vi.mocked(availabilityService.blockSlotRange).mockReturnValue(pending.promise);
    seed([slot('s1', 'open'), slot('s2', 'booked')]);

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate(AFTERNOON);

    await waitFor(() => expect(read()?.find((entry) => entry.id === 's1')?.status).toBe('held'));
    expect(read()?.find((entry) => entry.id === 's2')?.status).toBe('booked');
    pending.resolve({ blockedSlotIds: ['s1'], conflicts: [] });
  });

  it('restores the exact slot list when the block conflicts with a booking made meanwhile', async () => {
    const original = [slot('s1', 'open'), slot('s2', 'open')];
    seed(original);
    const restore = vi.spyOn(queryClient, 'setQueryData');
    vi.mocked(availabilityService.blockSlotRange).mockRejectedValue(
      new ApiError('One of these slots was just booked.', 409),
    );

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate(AFTERNOON);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(restore).toHaveBeenCalledWith(slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to), original);
    expect(read()).toEqual(original);
    expect(read()?.every((entry) => entry.status === 'open')).toBe(true);
  });

  it('explains the rollback as someone else booking the slot, not as a doctor error', async () => {
    seed([slot('s1', 'open')]);
    vi.mocked(availabilityService.blockSlotRange).mockRejectedValue(new ApiError('Slot no longer open.', 409));

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate(AFTERNOON);
    await waitFor(() => expect(result.current.isError).toBe(true));

    const notice = rollbackMessage(result.current.error);
    expect(notice).toContain('Slot no longer open.');
    expect(notice).toMatch(/while you were working/i);
    expect(notice).toMatch(/restored/i);
    expect(notice).toMatch(/nothing was cancelled/i);
  });

  it('applies the slot ids the server actually blocked once it answers', async () => {
    seed([slot('s1', 'open'), slot('s2', 'open')]);
    vi.mocked(availabilityService.blockSlotRange).mockResolvedValue({ blockedSlotIds: ['s2'], conflicts: [] });

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate(AFTERNOON);

    await waitFor(() => expect(read()?.find((entry) => entry.id === 's2')?.status).toBe('held'));
    expect(read()?.find((entry) => entry.id === 's1')?.status).toBe('open');
  });

  it('does not invent a range body for the block request', async () => {
    seed([slot('s1', 'open')]);
    const blockSlotRange = vi.mocked(availabilityService.blockSlotRange);
    blockSlotRange.mockResolvedValue({ blockedSlotIds: ['s1'], conflicts: [] });

    const { result } = renderMutation(() => useBlockSlotRange(DOCTOR), queryClient);
    result.current.mutate({ ...AFTERNOON, reason: 'Afternoon clinic' });

    await waitFor(() => expect(blockSlotRange).toHaveBeenCalled());
    expect(blockSlotRange.mock.calls[0][0]).toEqual({
      startTime: AFTERNOON.startTime,
      endTime: AFTERNOON.endTime,
      reason: 'Afternoon clinic',
    });
  });
});

describe('removing open slots', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    queryClient = createQueryClient();
    vi.mocked(availabilityService.removeSlot).mockReset();
  });

  const KEY = slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to);

  function seed(slots: AvailabilitySlot[]) {
    queryClient.setQueryData(KEY, slots);
  }

  function read(): AvailabilitySlot[] | undefined {
    return queryClient.getQueryData<AvailabilitySlot[]>(KEY);
  }

  it('takes the slot off the calendar before the delete comes back', async () => {
    const pending = deferred<void>();
    vi.mocked(availabilityService.removeSlot).mockReturnValue(pending.promise);
    seed([slot('s1', 'open'), slot('s2', 'open')]);

    const { result } = renderMutation(() => useRemoveSlots(DOCTOR), queryClient);
    result.current.mutate(['s1']);

    await waitFor(() => expect(read()?.map((entry) => entry.id)).toEqual(['s2']));
    pending.resolve();
  });

  it('puts the whole selection back when one slot was booked while you decided', async () => {
    const original = [slot('s1', 'open'), slot('s2', 'open')];
    seed(original);
    const restore = vi.spyOn(queryClient, 'setQueryData');
    vi.mocked(availabilityService.removeSlot).mockImplementation(async (slotId) => {
      if (slotId === 's2') throw new ApiError('This slot has been booked.', 409);
    });

    const { result } = renderMutation(() => useRemoveSlots(DOCTOR), queryClient);
    result.current.mutate(['s1', 's2']);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(restore).toHaveBeenCalledWith(KEY, original);
    expect(read()).toEqual(original);
  });

  it('reports how much of the batch went through when part of it conflicted', async () => {
    seed([slot('s1', 'open'), slot('s2', 'open')]);
    vi.mocked(availabilityService.removeSlot).mockImplementation(async (slotId) => {
      if (slotId === 's2') throw new ApiError('This slot has been booked.', 409);
    });

    const { result } = renderMutation(() => useRemoveSlots(DOCTOR), queryClient);
    result.current.mutate(['s1', 's2']);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rollbackMessage(result.current.error)).toContain('1 of 2');
  });

  it('keeps the removal once the server confirms it', async () => {
    seed([slot('s1', 'open'), slot('s2', 'open')]);
    vi.mocked(availabilityService.removeSlot).mockResolvedValue(undefined);

    const { result } = renderMutation(() => useRemoveSlots(DOCTOR), queryClient);
    result.current.mutate(['s1']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(read()?.map((entry) => entry.id)).toEqual(['s2']);
    expect(availabilityService.removeSlot).toHaveBeenCalledWith('s1', 'test-token');
  });
});

describe('undoing a block', () => {
  it('reopens the slot straight away and restores the block if the server refuses', async () => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    const queryClient = createQueryClient();
    const key = slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to);
    queryClient.setQueryData(key, [slot('s1', 'held')]);
    const pending = deferred<void>();
    vi.mocked(availabilityService.unblockSlot).mockReturnValue(pending.promise);

    const { result } = renderMutation(() => useUnblockSlot(DOCTOR), queryClient);
    result.current.mutate('s1');

    await waitFor(() =>
      expect(queryClient.getQueryData<AvailabilitySlot[]>(key)?.[0].status).toBe('open'),
    );

    pending.reject(new ApiError('That block is locked to the clinic rota.', 403));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<AvailabilitySlot[]>(key)).toEqual([slot('s1', 'held')]);
  });
});

describe('generating slots over a date range', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(availabilityService.generateSlots).mockReset();
  });

  const variables = {
    fromDate: '2026-10-12',
    toDate: '2026-10-14',
    startHour: 9,
    endHour: 13,
    slotLengthMinutes: 30,
    timeZone: 'Africa/Lagos',
  };

  it('sends one single-day request per day in the range', async () => {
    const generateSlots = vi.mocked(availabilityService.generateSlots);
    generateSlots.mockResolvedValue({ created: 0, skipped: 0, slots: [] });
    const queryClient = createQueryClient();

    const { result } = renderMutation(() => useGenerateSlots(DOCTOR), queryClient);
    result.current.mutate(variables);

    await waitFor(() => expect(generateSlots).toHaveBeenCalledTimes(3));
    expect(generateSlots.mock.calls.map((call) => call[1].date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(generateSlots.mock.calls[0][1]).toEqual({
      date: '2026-10-12',
      startHour: 9,
      endHour: 13,
      slotLengthMinutes: 30,
    });
  });

  it('aggregates created and skipped counts across the range', async () => {
    vi.mocked(availabilityService.generateSlots)
      .mockResolvedValueOnce({ created: 8, skipped: 0, slots: [] })
      .mockResolvedValueOnce({ created: 2, skipped: 6, slots: [] })
      .mockResolvedValueOnce({ created: 0, skipped: 8, slots: [] });
    const queryClient = createQueryClient();

    const { result } = renderMutation(() => useGenerateSlots(DOCTOR), queryClient);
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ created: 10, skipped: 14, requestedDays: 3, failedDays: [] });
  });

  it('names the days that failed without discarding the days that worked', async () => {
    vi.mocked(availabilityService.generateSlots).mockImplementation(async (profileId, input) => {
      expect(profileId).toBe(DOCTOR);
      if (input.date === '2026-10-13') throw new ApiError('That date is in the past.', 400);
      return { created: 4, skipped: 0, slots: [] };
    });
    const queryClient = createQueryClient();

    const { result } = renderMutation(() => useGenerateSlots(DOCTOR), queryClient);
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.created).toBe(8);
    expect(result.current.data?.failedDays).toEqual([{ date: '2026-10-13', message: 'That date is in the past.' }]);
  });

  it('adds the slots the server created to the cached window', async () => {
    const created = slot('new-1', 'open');
    vi.mocked(availabilityService.generateSlots).mockResolvedValue({ created: 1, skipped: 0, slots: [created] });
    const queryClient = createQueryClient();
    const key = slotsWindowKey(DOCTOR, WINDOW.from, WINDOW.to);
    queryClient.setQueryData(key, [slot('old-1', 'booked', { startTime: '2026-10-12T09:00:00.000Z' })]);

    const { result } = renderMutation(() => useGenerateSlots(DOCTOR), queryClient);
    await result.current.mutateAsync({ ...variables, toDate: '2026-10-12' });

    await waitFor(() => expect(queryClient.getQueryData<AvailabilitySlot[]>(key)).toHaveLength(2));
  });
});
