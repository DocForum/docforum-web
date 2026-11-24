import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { InlineError } from '../components/states/InlineError';
import { Skeleton } from '../components/states/Skeleton';
import { OverviewBoard } from '../features/admin-overview/components/OverviewBoard';
import { useOperationsOverview } from '../features/admin-overview/hooks/useOperationsOverview';
import { ApiError } from '../services/api-client';
import styles from '../features/admin-overview/components/AdminOverview.module.css';

/** The admin landing page: "what needs attention" across every queue
 * (issue #68). The payments console moved to `/admin/payments/console`.
 *
 * A 404/501 means docforum-core does not serve the overview yet (it is an
 * assumed contract, core#123). That renders a muted explanation plus links to
 * the individual consoles, never an error page — the admin can still work. */
export function AdminDashboardPage() {
  const overview = useOperationsOverview();
  const notServed =
    overview.isError &&
    overview.error instanceof ApiError &&
    (overview.error.status === 404 || overview.error.status === 501);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Operations overview</h1>
          <p className={styles.muted}>
            What needs attention across the platform. Updates every minute while this tab is open.
          </p>
        </div>
        <Button variant="secondary" onClick={() => overview.refetch()} loading={overview.isFetching}>
          Refresh now
        </Button>
      </header>

      {overview.isPending && (
        <div className="card" aria-busy="true">
          <Skeleton lines={4} label="Loading the operations overview" />
        </div>
      )}

      {overview.isError && !notServed && (
        <InlineError
          title="Couldn't load the operations overview"
          message="The board may be stale. Individual consoles below still work."
          onRetry={() => overview.refetch()}
        />
      )}

      {notServed && (
        <div className={`card ${styles.unavailable}`} role="status">
          <h2 className={styles.cardTitle}>The overview isn&apos;t available on this deployment yet.</h2>
          <p>
            docforum-core doesn&apos;t serve the aggregated operations endpoint yet, so there are no counts or ages
            to show. Each queue can still be opened directly from the links below.
          </p>
        </div>
      )}

      {overview.data && <OverviewBoard overview={overview.data} now={new Date()} />}

      {overview.data && (
        <p className={styles.muted}>
          Last updated {new Date(overview.data.generatedAt).toLocaleTimeString()}.
        </p>
      )}

      <section className="card" aria-labelledby="admin-consoles-heading">
        <h2 id="admin-consoles-heading">Go to a console</h2>
        <ul className={styles.footerLinks}>
          <li><Link to="/admin/users">Users</Link></li>
          <li><Link to="/admin/payments/console">Payments console</Link></li>
          <li><Link to="/admin/verifications">Doctor verifications</Link></li>
          <li><Link to="/admin/verification">Specialty claims</Link></li>
          <li><Link to="/admin/referrals">Referrals</Link></li>
          <li><Link to="/admin/disputes">Disputes</Link></li>
          <li><Link to="/admin/audit">Audit trail</Link></li>
          <li><Link to="/admin/flags">Feature flags</Link></li>
          <li><Link to="/admin/catalogs">Catalogs</Link></li>
          <li><Link to="/admin/system">System health</Link></li>
        </ul>
      </section>
    </div>
  );
}
