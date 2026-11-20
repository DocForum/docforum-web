import { useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { useTableUrlState, type FilterDefinition } from '../components/DataTable';
import { PaymentHistoryList } from '../features/payments/components/PaymentHistoryList';
import { usePaymentHistory } from '../features/payments/hooks/usePaymentHistory';
import { historyErrorCopy } from '../features/payments/status';
import { fetchAllPaymentHistory } from '../services/payment-history-service';
import { useAuthStore } from '../store/auth-store';
import { csvFilename, downloadCsv, toCsv } from '../features/admin-audit/csv';
import { PAYMENT_HISTORY_CSV_COLUMNS } from '../features/payments/csv';
import styles from './PaymentHistoryPage.module.css';

const PAYMENT_FILTERS: FilterDefinition[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'created', label: 'Unfunded' },
      { value: 'awaiting_signature', label: 'Awaiting signature' },
      { value: 'escrowed', label: 'In escrow' },
      { value: 'released', label: 'Released to facility' },
      { value: 'refunded', label: 'Refunded to patient' },
      { value: 'failed', label: 'Failed payments' },
    ],
  },
  {
    key: 'from',
    label: 'From',
    type: 'date',
  },
  {
    key: 'to',
    label: 'To',
    type: 'date',
  },
];

export function PaymentHistoryPage() {
  const { filterValues, setFilter, resetFilters } = useTableUrlState({
    id: 'payments',
    filters: PAYMENT_FILTERS,
  });

  const accessToken = useAuthStore((state) => state.accessToken);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const hasActiveFilters = Boolean(filterValues.status || filterValues.from || filterValues.to);

  const historyQuery = usePaymentHistory(filterValues);
  const entries = historyQuery.data?.pages.flatMap((page) => page.intents) ?? [];

  const handleExport = async () => {
    if (!accessToken || isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    try {
      const allEntries = await fetchAllPaymentHistory(
        {
          status: filterValues.status || undefined,
          from: filterValues.from || undefined,
          to: filterValues.to || undefined,
        },
        accessToken,
        (count) => setExportProgress(count),
      );
      const csv = toCsv(PAYMENT_HISTORY_CSV_COLUMNS, allEntries);
      downloadCsv(csvFilename('docforum-payment-history'), csv);
    } catch {
      setExportError('Payment export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // "You have paid for nothing" is a statement about the patient's money, so
  // it is only rendered from a response that arrived. A failed request says
  // what failed instead — and a later page failing still shows what loaded.
  let body: ReactNode;
  if (entries.length > 0) {
    body = <PaymentHistoryList entries={entries} />;
  } else if (historyQuery.isError) {
    body = null;
  } else if (historyQuery.isFetching) {
    body = <p className={styles.loading}>Loading your payments…</p>;
  } else if (hasActiveFilters) {
    body = (
      <div className={styles.emptyFiltered}>
        <p className={styles.empty}>No payments match your filters.</p>
        <Button variant="secondary" size="small" onClick={resetFilters}>
          Clear filters
        </Button>
      </div>
    );
  } else {
    body = <PaymentHistoryList entries={[]} />;
  }

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Payments</span>
        <h1 className={styles.title}>Your payments</h1>
        <p className={styles.intro}>
          Every payment you have made through DocForum, with where the money is now: still yours, held in escrow,
          released to the facility, or returned to you.
        </p>

        <div className={styles.toolbar} role="search" aria-label="Filter payments">
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="payments-filter-status">
              Status
            </label>
            <select
              id="payments-filter-status"
              className={styles.filterSelect}
              value={filterValues.status ?? ''}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="created">Unfunded</option>
              <option value="awaiting_signature">Awaiting signature</option>
              <option value="escrowed">In escrow</option>
              <option value="released">Released to facility</option>
              <option value="refunded">Refunded to patient</option>
              <option value="failed">Failed payments</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="payments-filter-from">
              From
            </label>
            <input
              id="payments-filter-from"
              type="date"
              className={styles.filterInput}
              value={filterValues.from ?? ''}
              onChange={(e) => setFilter('from', e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="payments-filter-to">
              To
            </label>
            <input
              id="payments-filter-to"
              type="date"
              className={styles.filterInput}
              value={filterValues.to ?? ''}
              onChange={(e) => setFilter('to', e.target.value)}
            />
          </div>

          {hasActiveFilters && entries.length > 0 ? (
            <Button
              variant="secondary"
              size="small"
              className={styles.clearButton}
              onClick={resetFilters}
            >
              Clear filters
            </Button>
          ) : null}

          <div className={styles.exportGroup}>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={isExporting || historyQuery.isError}
              loading={isExporting}
              aria-label="Export filtered payments as CSV"
            >
              {isExporting ? `Exporting… (${exportProgress})` : 'Export CSV'}
            </Button>
          </div>
        </div>

        {isExporting ? (
          <p className={styles.exportStatus} aria-live="polite">
            Exporting payment history… {exportProgress} {exportProgress === 1 ? 'payment' : 'payments'} loaded
          </p>
        ) : null}

        {exportError ? <FormError message={exportError} /> : null}

        {historyQuery.isError ? (
          <FormError message={entries.length > 0 ? 'Older payments could not be loaded.' : historyErrorCopy(historyQuery.error)} />
        ) : null}

        {body}

        {historyQuery.hasNextPage ? (
          <Button
            variant="secondary"
            className={styles.older}
            onClick={() => historyQuery.fetchNextPage()}
            loading={historyQuery.isFetchingNextPage}
          >
            {historyQuery.isFetchingNextPage ? 'Loading…' : 'Show older payments'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
