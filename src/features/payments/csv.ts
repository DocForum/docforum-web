// Client-side CSV export of patient payment history.
// Paged through the filtered endpoint in memory, formatted safely (amounts
// from stroop strings without float conversion, formula injection prevented,
// explorer links generated without personal data).
import type { PaymentHistoryEntry } from '../../types/models';
import { type CsvColumn, escapeCsvCell, toCsv, csvFilename, downloadCsv } from '../admin-audit/csv';
import { amountLabel } from './stroops';
import { orderTypeLabel, statusLabel } from './status';
import { transactionUrl } from './explorer';

export const PAYMENT_HISTORY_CSV_COLUMNS: CsvColumn<PaymentHistoryEntry>[] = [
  { header: 'ID', value: (row) => row.id },
  { header: 'Date', value: (row) => row.createdAt },
  { header: 'Type', value: (row) => orderTypeLabel(row.orderType) },
  { header: 'Facility', value: (row) => row.facilityName ?? '' },
  { header: 'Status', value: (row) => statusLabel(row.status) },
  { header: 'Amount', value: (row) => amountLabel(row.amountStroops) },
  { header: 'Explorer Link', value: (row) => transactionUrl(row.stellarTxHash) ?? '' },
];

export function paymentHistoryToCsv(entries: PaymentHistoryEntry[]): string {
  return toCsv(PAYMENT_HISTORY_CSV_COLUMNS, entries);
}

export { escapeCsvCell, toCsv, csvFilename, downloadCsv };
