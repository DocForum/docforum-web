import { afterEach, describe, expect, it, vi } from 'vitest';
import { findThreadIdsForPatients } from './messaging-service';
import type { DoctorMessageThread } from '../types/models';

function thread(id: string, patientProfileId: string): DoctorMessageThread {
  return {
    id,
    patientProfileId,
    patientName: 'Fake Patient',
    lastMessageAt: '2026-01-01T00:00:00Z',
    unreadCount: 0,
  };
}

function respondPage(threads: DoctorMessageThread[], nextCursor: string | null) {
  return new Response(JSON.stringify({ threads, nextCursor }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findThreadIdsForPatients', () => {
  it('walks every page so a patient on a later page still gets a thread', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respondPage([thread('thread-1', 'pat-1')], 'page-2'))
      .mockResolvedValueOnce(respondPage([thread('thread-3', 'pat-3')], null));

    await expect(
      findThreadIdsForPatients(['pat-1', 'pat-3'], 'token'),
    ).resolves.toEqual({ 'pat-1': 'thread-1', 'pat-3': 'thread-3' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1][0])).toContain('cursor=page-2');
  });

  it('stops once every requested patient has been matched', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        respondPage([thread('thread-1', 'pat-1'), thread('thread-2', 'pat-2')], 'page-2'),
      );

    await expect(
      findThreadIdsForPatients(['pat-1', 'pat-2'], 'token'),
    ).resolves.toEqual({ 'pat-1': 'thread-1', 'pat-2': 'thread-2' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('omits patients who have no thread', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respondPage([thread('thread-1', 'pat-1')], null));

    await expect(
      findThreadIdsForPatients(['pat-1', 'pat-9'], 'token'),
    ).resolves.toEqual({ 'pat-1': 'thread-1' });
  });

  it('does not call the API for an empty inbox', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(findThreadIdsForPatients([], 'token')).resolves.toEqual({});

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
