import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listPaymentHistory, fetchAllPaymentHistory, getPaymentHistoryEntry } from './payment-history-service';
import * as apiClient from './api-client';
import type { PaymentHistoryEntry } from '../types/models';

vi.mock('./api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-client')>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

function mockEntry(id: string): PaymentHistoryEntry {
  return {
    id,
    orderType: 'prescription',
    orderId: 'ord-1',
    status: 'escrowed',
    patientProfileId: 'pp-1',
    facilityId: 'fac-1',
    amountStroops: '10000000',
    escrowId: '1',
    stellarTxHash: 'tx-1',
    sorobanContractId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  };
}

describe('payment-history-service', () => {
  beforeEach(() => {
    vi.mocked(apiClient.apiFetch).mockReset();
  });

  describe('listPaymentHistory', () => {
    it('fetches /payments/mine without query params when no params are provided', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue({ intents: [mockEntry('pi-1')], nextCursor: null });

      const res = await listPaymentHistory(undefined, 'test-token');

      expect(apiClient.apiFetch).toHaveBeenCalledWith('/payments/mine', {
        accessToken: 'test-token',
        signal: undefined,
      });
      expect(res.intents).toHaveLength(1);
      expect(res.nextCursor).toBeNull();
    });

    it('handles a plain string cursor parameter for backward compatibility', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue({ intents: [], nextCursor: null });

      await listPaymentHistory('cur-123', 'test-token');

      expect(apiClient.apiFetch).toHaveBeenCalledWith('/payments/mine?cursor=cur-123', {
        accessToken: 'test-token',
        signal: undefined,
      });
    });

    it('serializes filter parameters into query string', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue({ intents: [], nextCursor: null });

      await listPaymentHistory(
        {
          status: 'released',
          from: '2026-10-01',
          to: '2026-10-31',
          limit: 50,
          cursor: 'cur-456',
        },
        'test-token',
      );

      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/payments/mine?cursor=cur-456&status=released&from=2026-10-01&to=2026-10-31&limit=50',
        { accessToken: 'test-token', signal: undefined },
      );
    });

    it('ignores status when it is "all" or empty', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue({ intents: [], nextCursor: null });

      await listPaymentHistory({ status: 'all', from: '' }, 'test-token');

      expect(apiClient.apiFetch).toHaveBeenCalledWith('/payments/mine', {
        accessToken: 'test-token',
        signal: undefined,
      });
    });

    it('normalizes response if backend sends items instead of intents', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue({ items: [mockEntry('pi-item')], nextCursor: 'next-1' });

      const res = await listPaymentHistory(undefined, 'test-token');

      expect(res.intents).toHaveLength(1);
      expect(res.intents[0].id).toBe('pi-item');
      expect(res.nextCursor).toBe('next-1');
    });
  });

  describe('fetchAllPaymentHistory', () => {
    it('pages through results until nextCursor is null and reports progress', async () => {
      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce({ intents: [mockEntry('pi-1'), mockEntry('pi-2')], nextCursor: 'cur-p2' })
        .mockResolvedValueOnce({ intents: [mockEntry('pi-3')], nextCursor: null });

      const progressSpy = vi.fn();
      const all = await fetchAllPaymentHistory({ status: 'escrowed' }, 'test-token', progressSpy);

      expect(all).toHaveLength(3);
      expect(all.map((e) => e.id)).toEqual(['pi-1', 'pi-2', 'pi-3']);
      expect(progressSpy).toHaveBeenCalledWith(2);
      expect(progressSpy).toHaveBeenCalledWith(3);
      expect(apiClient.apiFetch).toHaveBeenCalledTimes(2);
      expect(apiClient.apiFetch).toHaveBeenNthCalledWith(
        1,
        '/payments/mine?status=escrowed&limit=100',
        { accessToken: 'test-token', signal: undefined },
      );
      expect(apiClient.apiFetch).toHaveBeenNthCalledWith(
        2,
        '/payments/mine?cursor=cur-p2&status=escrowed&limit=100',
        { accessToken: 'test-token', signal: undefined },
      );
    });
  });

  describe('getPaymentHistoryEntry', () => {
    it('fetches single entry by id', async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValue(mockEntry('pi-single'));

      const res = await getPaymentHistoryEntry('pi-single', 'test-token');

      expect(apiClient.apiFetch).toHaveBeenCalledWith('/payments/intents/pi-single', {
        accessToken: 'test-token',
        signal: undefined,
      });
      expect(res.id).toBe('pi-single');
    });
  });
});
