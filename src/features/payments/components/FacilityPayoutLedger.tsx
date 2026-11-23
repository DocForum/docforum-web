import { useState } from 'react';
import { useFacilityLedger } from '../hooks/useFacilityLedger';
import { formatStroops } from '../../../services/payments-service';
import { QueryState } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/Button';
import type { FacilityLedgerPage } from '../../../types/models';
import styles from './FacilityPayoutLedger.module.css';

interface FacilityPayoutLedgerProps {
  facilityId?: string;
}

function TotalsSkeleton() {
  return (
    <div className={styles.totalsGrid} aria-hidden="true">
      {[0, 1, 2].map((card) => (
        <div key={card} className={styles.totalCard}>
          <Skeleton lines={4} height="1.25rem" label="Loading escrow totals" />
        </div>
      ))}
    </div>
  );
}

function TotalsCards({
  totals,
  hasApproachingDeadlines,
}: {
  totals: FacilityLedgerPage['totals'];
  hasApproachingDeadlines: boolean;
}) {
  return (
    <div className={styles.totalsGrid} aria-label="Escrow payout totals">
      <div className={`${styles.totalCard} ${styles.totalCardHeld}`}>
        <div className={styles.totalCardHeader}>
          <span className={styles.totalLabel}>Held in Escrow</span>
          {hasApproachingDeadlines && (
            <span className={styles.approachingBadge}>⚠️ Deadline alert</span>
          )}
        </div>
        <div className={styles.assetBreakdown}>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>Stellar Lumens (XLM)</span>
            <span className={styles.assetAmount} data-testid="held-xlm">
              {formatStroops(totals.xlm.heldStroops, 'XLM')}
            </span>
          </div>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>USD Coin (USDC)</span>
            <span className={styles.assetAmount} data-testid="held-usdc">
              {formatStroops(totals.usdc.heldStroops, 'USDC')}
            </span>
          </div>
        </div>
      </div>

      <div className={`${styles.totalCard} ${styles.totalCardReleased}`}>
        <div className={styles.totalCardHeader}>
          <span className={styles.totalLabel}>Released to Facility</span>
        </div>
        <div className={styles.assetBreakdown}>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>Stellar Lumens (XLM)</span>
            <span className={styles.assetAmount} data-testid="released-xlm">
              {formatStroops(totals.xlm.releasedStroops, 'XLM')}
            </span>
          </div>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>USD Coin (USDC)</span>
            <span className={styles.assetAmount} data-testid="released-usdc">
              {formatStroops(totals.usdc.releasedStroops, 'USDC')}
            </span>
          </div>
        </div>
      </div>

      <div className={`${styles.totalCard} ${styles.totalCardRefunded}`}>
        <div className={styles.totalCardHeader}>
          <span className={styles.totalLabel}>Refunded to Patient</span>
        </div>
        <div className={styles.assetBreakdown}>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>Stellar Lumens (XLM)</span>
            <span className={styles.assetAmount} data-testid="refunded-xlm">
              {formatStroops(totals.xlm.refundedStroops, 'XLM')}
            </span>
          </div>
          <div className={styles.assetRow}>
            <span className={styles.assetName}>USD Coin (USDC)</span>
            <span className={styles.assetAmount} data-testid="refunded-usdc">
              {formatStroops(totals.usdc.refundedStroops, 'USDC')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FacilityPayoutLedger({ facilityId = 'fac-main' }: FacilityPayoutLedgerProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');

  const ledger = useFacilityLedger(facilityId, {
    status: statusFilter,
    asset: assetFilter,
  });

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = ledger;

  const pages = data?.pages ?? [];
  const totals = pages[0]?.totals;
  const entries = pages.flatMap((page) => page.entries);
  const hasApproachingDeadlines = entries.some(
    (e) => e.status === 'held' && e.terms.isApproachingDeadline,
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setAssetFilter('all');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Facility payout ledger &amp; escrow terms</h1>
        <p className={styles.subtitle}>
          Track escrow deposits held on Stellar, review release conditions and deadlines, and verify
          on-chain settlement.
        </p>
      </div>

      <div className={styles.threatNotice} role="region" aria-label="Escrow terms guidance">
        <strong>Escrow Terms Security (Threat Model T8):</strong> All customer payments are held in
        non-custodial Soroban smart contracts. To prevent delivery defaults or disputed forfeitures, review
        releaser terms and fulfill orders well before refund deadlines.
      </div>

      <QueryState
        result={{ isPending, isError, error, data: totals, refetch }}
        loading={<TotalsSkeleton />}
        loadingLabel="Loading escrow totals"
        errorTitle="Escrow totals couldn't be loaded"
        onRetry={() => void refetch()}
        isEmpty={(value) => !value}
        empty={
          <EmptyState
            title="No escrow totals"
            description="The ledger returned no totals for this facility yet."
            action={{ label: 'Reload', onClick: () => void refetch() }}
          />
        }
      >
        {(totalsData) => (
          <TotalsCards totals={totalsData} hasApproachingDeadlines={hasApproachingDeadlines} />
        )}
      </QueryState>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="status-filter">Escrow Status:</label>
          <select
            id="status-filter"
            className={styles.selectInput}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="held">Held in escrow</option>
            <option value="released">Released to facility</option>
            <option value="refunded">Refunded to patient</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="asset-filter">Asset:</label>
          <select
            id="asset-filter"
            className={styles.selectInput}
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
          >
            <option value="all">All assets</option>
            <option value="XLM">XLM (Lumens)</option>
            <option value="USDC">USDC (USD Coin)</option>
          </select>
        </div>
      </div>

      <QueryState
        result={{ isPending, isError, error, data: data ? entries : undefined, refetch }}
        loading={<Skeleton lines={6} height="2rem" label="Loading facility payout ledger" />}
        loadingLabel="Loading facility payout ledger"
        errorTitle="The payout ledger couldn't be loaded"
        onRetry={() => void refetch()}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No escrow entries"
            description={
              statusFilter !== 'all' || assetFilter !== 'all'
                ? 'No entries match the selected filters. Clear them to see the whole ledger.'
                : 'This facility has no escrow entries yet.'
            }
            action={{ label: 'Clear filters', onClick: clearFilters }}
          />
        }
      >
        {(rows) => (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text)' }}>
                Order Escrow Ledger ({rows.length} {rows.length === 1 ? 'record' : 'records'})
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order &amp; Patient</th>
                  <th scope="col">Status</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Escrow Terms &amp; Refund Deadline</th>
                  <th scope="col">Stellar Explorer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const isWarning = entry.status === 'held' && entry.terms.isApproachingDeadline;
                  return (
                    <tr key={entry.id} className={isWarning ? styles.tableRowAlert : undefined}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {entry.orderItemName}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Patient: {entry.patientName} • Order ID: <code>{entry.orderId}</code>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            entry.status === 'held'
                              ? styles.statusHeld
                              : entry.status === 'released'
                              ? styles.statusReleased
                              : styles.statusRefunded
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {formatStroops(entry.amountStroops, entry.asset)}
                        </div>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div>
                          <span className={styles.releaserTag}>Releaser:</span> {entry.terms.releaserDescription}
                        </div>
                        <div className={styles.termsText}>
                          <strong>Refund cutoff:</strong> {new Date(entry.terms.refundDeadline).toLocaleString()}
                          {entry.status === 'held' && (
                            <span> ({entry.terms.hoursUntilRefund}h remaining)</span>
                          )}
                        </div>
                        {isWarning && (
                          <div role="alert" className={styles.warningAlertBox}>
                            <span>⚠️</span>
                            <span>
                              <strong>Approaching Deadline:</strong> Only {entry.terms.hoursUntilRefund}h left to
                              fulfill before escrow funds are automatically refundable to the patient!
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${entry.fundTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.explorerLink}
                            title="View funding transaction on Stellar Expert"
                          >
                            Fund Tx ↗
                          </a>
                          {entry.releaseTxHash && (
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${entry.releaseTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.explorerLink}
                              title="View release transaction on Stellar Expert"
                            >
                              Release Tx ↗
                            </a>
                          )}
                          {entry.refundTxHash && (
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${entry.refundTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.explorerLink}
                              title="View refund transaction on Stellar Expert"
                            >
                              Refund Tx ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>

      {data && hasNextPage && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => void fetchNextPage()}
            loading={isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      )}

      {isFetchNextPageError && (
        <div role="alert" className={styles.loadMoreError}>
          <span>Couldn't load more entries. The pages already shown are still valid.</span>
          <button type="button" className={styles.retryLink} onClick={() => void fetchNextPage()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
