import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  useTableUrlState,
  type ColumnDefinition,
  type FilterDefinition,
} from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime } from '../../../i18n/time-zone';
import { ApiError } from '../../../services/api-client';
import { formatStroops } from '../../../services/payments-service';
import { transactionUrl } from '../explorer';
import { useFacilityLedger } from '../hooks/useFacilityLedger';
import type {
  FacilityLedgerItem,
  FacilityLedgerStatus,
  FacilityLedgerTotals,
} from '../../../types/models';
import styles from './FacilityPayoutLedger.module.css';

interface FacilityPayoutLedgerProps {
  facilityId?: string;
}

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<FacilityLedgerStatus, string> = {
  created: 'Unfunded',
  funding: 'Funding',
  escrowed: 'Held in escrow',
  released: 'Released to facility',
  refunded: 'Refunded to patient',
  failed: 'Failed',
};

const LEDGER_FILTERS: FilterDefinition[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: (Object.keys(STATUS_LABELS) as FacilityLedgerStatus[]).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
    })),
  },
  { key: 'from', label: 'From', type: 'date' },
  { key: 'to', label: 'To', type: 'date' },
];

function statusClass(status: FacilityLedgerStatus): string {
  switch (status) {
    case 'released':
      return styles.statusReleased;
    case 'failed':
      return styles.statusFailed;
    case 'escrowed':
    case 'funding':
      return styles.statusHeld;
    default:
      return styles.statusRefunded;
  }
}

function hoursUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return (at - now) / 3_600_000;
}

function totalFor(
  totals: FacilityLedgerTotals[],
  code: string,
  key: 'escrowed' | 'released' | 'refunded',
): string {
  return totals.find((total) => total.asset.code === code)?.[key] ?? '0';
}

function TotalCard({
  title,
  tone,
  totals,
  field,
  badge,
}: {
  title: string;
  tone: string;
  totals: FacilityLedgerTotals[];
  field: 'escrowed' | 'released' | 'refunded';
  badge?: string;
}) {
  return (
    <div className={`${styles.totalCard} ${tone}`}>
      <div className={styles.totalCardHeader}>
        <span className={styles.totalLabel}>{title}</span>
        {badge ? <span className={styles.approachingBadge}>{badge}</span> : null}
      </div>
      <div className={styles.assetBreakdown}>
        {totals.length === 0 ? (
          <div className={styles.assetRow}>
            <span className={styles.assetName}>No payments in this range</span>
          </div>
        ) : (
          totals.map((total) => (
            <div key={total.asset.code} className={styles.assetRow}>
              <span className={styles.assetName}>{total.asset.code}</span>
              <span
                className={styles.assetAmount}
                data-testid={`${field === 'escrowed' ? 'held' : field}-${total.asset.code.toLowerCase()}`}
              >
                {formatStroops(totalFor(totals, total.asset.code, field), total.asset.code)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FacilityPayoutLedger({ facilityId = 'fac-main' }: FacilityPayoutLedgerProps) {
  const { timeZone } = useTimeZone();
  const { filterValues, setFilter, resetFilters, cursor, setCursor } = useTableUrlState({
    id: 'ledger',
    filters: LEDGER_FILTERS,
  });

  // Cursor trail for the "Newer" button. The cursor itself lives in the URL
  // (useTableUrlState), and a filter change clears both.
  const [trail, setTrail] = useState<(string | null)[]>([]);
  const filterSignature = [filterValues.status, filterValues.from, filterValues.to].join('|');

  useEffect(() => {
    setTrail([]);
  }, [filterSignature]);

  const filters = useMemo(
    () => ({
      status: filterValues.status || undefined,
      from: filterValues.from || undefined,
      to: filterValues.to || undefined,
      cursor: cursor ?? undefined,
      limit: PAGE_SIZE,
    }),
    [filterValues.status, filterValues.from, filterValues.to, cursor],
  );

  const { data, isLoading, error, refetch } = useFacilityLedger(facilityId, filters);
  const items = data?.items ?? [];
  const totals = data?.totals ?? [];

  const invalidCursor = error instanceof ApiError && error.code === 'INVALID_CURSOR';

  // A cursor from a previous filter selection (e.g. a bookmarked URL) is no
  // longer valid. Reset to the newest page rather than showing an error the
  // admin cannot act on.
  useEffect(() => {
    if (!invalidCursor || !cursor) return;
    setTrail([]);
    setCursor(null);
  }, [invalidCursor, cursor, setCursor]);

  const hasActiveFilters = Boolean(filterValues.status || filterValues.from || filterValues.to);
  const hasApproachingDeadline = items.some((item) => {
    const hours = hoursUntil(item.refundAfter);
    return item.status === 'escrowed' && hours !== null && hours >= 0 && hours < 48;
  });

  const goNext = () => {
    const next = data?.nextCursor;
    if (!next) return;
    setTrail((previous) => [...previous, cursor]);
    setCursor(next);
  };

  const goPrev = () => {
    if (trail.length === 0) return;
    const previous = trail[trail.length - 1];
    setTrail((previousTrail) => previousTrail.slice(0, -1));
    setCursor(previous);
  };

  const columns: ColumnDefinition<FacilityLedgerItem>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (item) => (
        <div>
          <div className={styles.orderTitle}>
            {item.orderType === 'prescription' ? 'Prescription' : 'Lab order'}
          </div>
          <div className={styles.orderMeta}>
            Order <code>{item.orderId}</code>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={`${styles.statusPill} ${statusClass(item.status)}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item) => (
        <span className={styles.amount}>{formatStroops(item.amount, item.assetCode)}</span>
      ),
    },
    {
      key: 'escrow',
      header: 'Escrow',
      render: (item) => (
        <div className={styles.escrowCell}>
          <span>{item.escrowId ? `Escrow ${item.escrowId}` : 'Not funded'}</span>
          {item.status === 'escrowed' && item.refundAfter ? (
            <span className={styles.termsText}>
              Refundable after {formatDateTime(item.refundAfter, timeZone)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'transaction',
      header: 'Transaction',
      render: (item) =>
        item.stellarTxHash ? (
          <a
            href={transactionUrl(item.stellarTxHash) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.explorerLink}
            title="View this transaction on Stellar Expert"
          >
            View transaction ↗
          </a>
        ) : (
          <span className={styles.mutedCell}>—</span>
        ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Facility payout ledger</h1>
        <p className={styles.subtitle}>
          Every escrow payment routed to this facility, with the lifecycle totals for the selected
          range. Only order references are shown — patient details stay out of the payout ledger.
        </p>
      </div>

      <div className={styles.threatNotice} role="note">
        <strong>Held funds:</strong> payments stay in escrow until docforum-core's release rule
        for the order is met. Fulfil orders before the refund deadline shown against each escrow.
      </div>

      {data ? (
        <div className={styles.totalsGrid} aria-label="Payout totals for the selected range">
          <TotalCard
            title="Held in escrow"
            tone={styles.totalCardHeld}
            totals={totals}
            field="escrowed"
            badge={hasApproachingDeadline ? '⚠️ Deadline within 48h' : undefined}
          />
          <TotalCard
            title="Released to facility"
            tone={styles.totalCardReleased}
            totals={totals}
            field="released"
          />
          <TotalCard
            title="Refunded to patient"
            tone={styles.totalCardRefunded}
            totals={totals}
            field="refunded"
          />
        </div>
      ) : null}

      {invalidCursor ? (
        <p className={styles.staleNote} role="status">
          That page is no longer valid for these filters. Showing the newest page instead.
        </p>
      ) : null}

      {error && !invalidCursor ? (
        <InlineError
          title="The payout ledger couldn't be loaded"
          message={queryErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <DataTable
            id="ledger"
            caption="Facility payout ledger"
            columns={columns}
            filters={LEDGER_FILTERS}
            rows={items}
            rowKey={(item) => item.id}
            isLoading={isLoading}
            sort={null}
            onSortChange={() => undefined}
            filterValues={filterValues}
            onFilterChange={setFilter}
            hasPrev={trail.length > 0}
            hasNext={Boolean(data?.nextCursor)}
            onPrev={goPrev}
            onNext={goNext}
            totalLoaded={items.length}
          />
          {hasActiveFilters ? (
            <div>
              <Button variant="secondary" size="small" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
