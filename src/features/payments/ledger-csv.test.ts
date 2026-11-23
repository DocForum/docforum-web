import { describe, expect, it, vi } from 'vitest';
import {
  LEDGER_CSV_COLUMNS,
  fetchAllLedgerRows,
  ledgerToCsv,
  type LedgerPageFetcher,
} from './ledger-csv';
import type { FacilityLedgerItem } from '../../types/models';

function row(overrides: Partial<FacilityLedgerItem> = {}): FacilityLedgerItem {
  return {
    id: 'ledg-1',
    orderType: 'prescription',
    orderId: 'ord-1',
    status: 'escrowed',
    amount: '500000000',
    assetCode: 'XLM',
    asset: { type: 'native', code: 'XLM' },
    escrowId: 'esc-1',
    stellarTxHash: 'abc123',
    sorobanContractId: null,
    refundAfter: '2026-10-18T08:00:00Z',
    createdAt: '2026-10-17T08:00:00Z',
    updatedAt: '2026-10-17T08:00:00Z',
    ...overrides,
  };
}

describe('facility payout ledger CSV (#278)', () => {
  it('exports the reconciled fields with stable header names', () => {
    const headers = LEDGER_CSV_COLUMNS.map((column) => column.header);
    expect(headers).toEqual([
      'Order type',
      'Order reference',
      'Ledger entry id',
      'Status',
      'Amount (stroops)',
      'Asset',
      'Escrow id',
      'Transaction hash',
      'Created at',
      'Updated at',
      'Refundable after',
    ]);
    // Patient identity never appears in the ledger export.
    expect(headers.some((header) => /patient/i.test(header))).toBe(false);
  });

  it('writes machine values, never formatted amounts or localised labels', () => {
    const csv = ledgerToCsv([row({ amount: '75000000', assetCode: 'USDC', status: 'released' })]);
    const [header, line] = csv.split('\r\n');
    expect(header).toContain('Amount (stroops)');
    expect(line).toContain('75000000');
    expect(line).toContain('USDC');
    expect(line).toContain('released');
    expect(line).not.toContain('7.5');
  });

  it('neutralises spreadsheet formulas in server-provided cells', () => {
    const csv = ledgerToCsv([
      row({
        orderId: '=HYPERLINK("http://evil","click")',
        escrowId: '+1',
        stellarTxHash: '-1',
        status: 'escrowed',
        id: '@SUM(A1)',
      }),
    ]);
    const line = csv.split('\r\n')[1];

    expect(line).toContain(`"'=HYPERLINK(""http://evil"",""click"")"`);
    expect(line).toContain(`'+1`);
    expect(line).toContain(`'-1`);
    expect(line).toContain(`'@SUM(A1)`);
  });

  it('pages through every cursor of the filter and reports progress', async () => {
    const fetchPage = vi.fn<LedgerPageFetcher>(async (cursor) => {
      if (!cursor) return { items: [row({ id: 'a' }), row({ id: 'b' })], nextCursor: 'cur-2' };
      if (cursor === 'cur-2') return { items: [row({ id: 'c' })], nextCursor: 'cur-3' };
      return { items: [row({ id: 'd' })], nextCursor: null };
    });
    const onProgress = vi.fn();

    const rows = await fetchAllLedgerRows(fetchPage, { onProgress });

    expect(rows.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, 'cur-2', 'cur-3']);
    expect(onProgress.mock.calls.map(([count]) => count)).toEqual([2, 3, 4]);
  });

  it('stops instead of looping when the server repeats a cursor', async () => {
    const fetchPage = vi.fn<LedgerPageFetcher>(async () => ({
      items: [row()],
      nextCursor: 'same-cursor',
    }));

    const rows = await fetchAllLedgerRows(fetchPage);

    // The repeat is only observable once requested, so exactly one extra page
    // is fetched — never an unbounded loop.
    expect(rows).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops when the caller aborts a long export', async () => {
    const controller = new AbortController();
    let page = 0;
    const fetchPage = vi.fn<LedgerPageFetcher>(async (_cursor, signal) => {
      page += 1;
      // First page arrives, then the person cancels.
      if (page === 1) {
        controller.abort();
        return { items: [row()], nextCursor: 'cur-2' };
      }
      expect(signal?.aborted).toBe(true);
      signal?.throwIfAborted();
      return { items: [row()], nextCursor: null };
    });

    await expect(fetchAllLedgerRows(fetchPage, { signal: controller.signal })).rejects.toBeTruthy();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
