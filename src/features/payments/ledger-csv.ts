// CSV export of the facility payout ledger (issue #278). Finance staff
// reconcile escrow releases in their own accounting system, so the export
// covers **every page of the current filter**, not just the visible one.
//
// Values are the machine-readable ones on purpose: raw status tokens and
// stroop amounts, never formatted/localised labels, so a spreadsheet's
// numbers stay exact and a re-import does not depend on the UI language.
// Only order references appear — the ledger shows no patient details, and the
// export must not introduce any.
import type { FacilityLedgerItem } from '../../types/models';
import { getFacilityPayoutLedger, type FacilityLedgerFilters } from '../../services/payments-service';
import type { CsvColumn } from '../../utils/csv';
import { csvFilename, downloadCsv, toCsv } from '../../utils/csv';

/** Server page size while exporting. Larger than the table's 50 to keep the
 * number of round-trips down without asking for everything at once. */
export const LEDGER_EXPORT_PAGE_SIZE = 100;

/** A repeated cursor would loop forever on a misbehaving server. */
const MAX_PAGES = 1000;

export interface LedgerExportOptions {
  /** Called after each page with the running row count, for the progress line. */
  onProgress?: (loadedCount: number) => void;
  signal?: AbortSignal;
}

/** One response per cursor, in the shape the service returns. */
export type LedgerPageFetcher = (
  cursor: string | undefined,
  signal: AbortSignal | undefined,
) => Promise<{ items: FacilityLedgerItem[]; nextCursor: string | null }>;

/**
 * Walk the filter's pages until `nextCursor` runs out, or the caller aborts.
 * A cancelled export throws the abort reason — it never downloads a partial
 * file that looks complete.
 */
export async function fetchAllLedgerRows(
  fetchPage: LedgerPageFetcher,
  options: LedgerExportOptions = {},
): Promise<FacilityLedgerItem[]> {
  const { onProgress, signal } = options;
  const rows: FacilityLedgerItem[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    signal?.throwIfAborted();
    const result = await fetchPage(cursor, signal);
    rows.push(...result.items);
    onProgress?.(rows.length);

    if (!result.nextCursor) return rows;
    if (seenCursors.has(result.nextCursor)) return rows;
    seenCursors.add(result.nextCursor);
    cursor = result.nextCursor;
  }

  return rows;
}

/** Binds the pager to the real service for one filter. */
export function fetchLedgerForFilter(
  accessToken: string,
  filters: Omit<FacilityLedgerFilters, 'cursor' | 'limit'>,
  options: LedgerExportOptions = {},
): Promise<FacilityLedgerItem[]> {
  return fetchAllLedgerRows(
    (cursor, signal) =>
      getFacilityPayoutLedger(
        accessToken,
        { ...filters, cursor, limit: LEDGER_EXPORT_PAGE_SIZE },
        signal,
      ),
    options,
  );
}

/** Stable header names, one per reconciled field. */
export const LEDGER_CSV_COLUMNS: CsvColumn<FacilityLedgerItem>[] = [
  { header: 'Order type', value: (row) => row.orderType },
  { header: 'Order reference', value: (row) => row.orderId },
  { header: 'Ledger entry id', value: (row) => row.id },
  { header: 'Status', value: (row) => row.status },
  { header: 'Amount (stroops)', value: (row) => row.amount },
  { header: 'Asset', value: (row) => row.assetCode },
  { header: 'Escrow id', value: (row) => row.escrowId },
  { header: 'Transaction hash', value: (row) => row.stellarTxHash },
  { header: 'Created at', value: (row) => row.createdAt },
  { header: 'Updated at', value: (row) => row.updatedAt },
  { header: 'Refundable after', value: (row) => row.refundAfter },
];

export function ledgerToCsv(rows: FacilityLedgerItem[]): string {
  return toCsv(LEDGER_CSV_COLUMNS, rows);
}

export function downloadLedgerCsv(rows: FacilityLedgerItem[], now: Date = new Date()): void {
  downloadCsv(csvFilename('docforum-facility-payout-ledger', now), ledgerToCsv(rows));
}
