import { Button } from '../../../components/Button';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { REFRESH_INTERVAL_MS, boardErrorMessage } from '../sections';
import { QueueCard } from './QueueCard';
import styles from './AdminOverview.module.css';

/**
 * "What needs attention" board: one card per queue the backend's registry
 * reports (count, oldest age, drill-down), auto-refreshing every minute
 * while the tab is visible. Sections that report unavailable render a muted
 * card in place — a missing queue never takes down the board, and a
 * whole-endpoint `404` (docforum-core#123 not landed yet) is a muted
 * notice, not an error page.
 */
export function AdminOverviewBoard() {
  const overview = useAdminOverview();
  // Re-rendered on every poll, so relative ages stay current with the data.
  const now = Date.now();
  const fetching = overview.isFetching;
  const lastUpdated = overview.dataUpdatedAt;

  const refresh = () => {
    void overview.refetch();
  };

  return (
    <section className={styles.board} aria-labelledby="admin-overview-title">
      <header className={styles.header}>
        <div>
          <h1 id="admin-overview-title" className={styles.title}>
            Operations overview
          </h1>
          <p className={styles.subtitle}>
            Every queue that needs attention in one board — verifications, referrals, orders, payments, jobs and
            disputes, each with its count, oldest age and a drill-down.
          </p>
        </div>
        <div className={styles.refresh}>
          {/* Not a live region: announcing every 60-second poll would be noise. */}
          <p className={styles.refreshText}>
            {lastUpdated > 0 ? (
              <>
                Updated{' '}
                <time dateTime={new Date(lastUpdated).toISOString()}>
                  {new Date(lastUpdated).toLocaleTimeString('en-GB')}
                </time>
              </>
            ) : (
              'Not loaded yet'
            )}
            {fetching && ' · refreshing…'}
          </p>
          <p className={styles.refreshHint}>
            Refreshes every {REFRESH_INTERVAL_MS / 1000} seconds while this tab is visible.
          </p>
          <Button variant="secondary" onClick={refresh} disabled={fetching}>
            Refresh now
          </Button>
        </div>
      </header>

      {overview.error && !overview.data && (
        <p className={styles.notice} role="status">
          {boardErrorMessage(overview.error)}
        </p>
      )}

      {overview.isLoading && !overview.error && (
        <p className={styles.loading} role="status">
          Loading the board…
        </p>
      )}

      {overview.data && overview.error && (
        <p className={styles.staleBanner} role="status">
          Couldn&apos;t refresh — showing the board from{' '}
          {new Date(lastUpdated).toLocaleTimeString('en-GB')}.
        </p>
      )}

      {overview.data && overview.data.sections.length === 0 && (
        <p className={styles.empty}>docforum-core reported no queues yet.</p>
      )}

      {overview.data && overview.data.sections.length > 0 && (
        <div className={styles.grid}>
          {overview.data.sections.map((section) => (
            <QueueCard key={section.key} section={section} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
