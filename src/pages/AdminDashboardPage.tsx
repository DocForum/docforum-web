import { Link } from 'react-router-dom';
import { AdminOverviewBoard } from '../features/admin-overview/components/AdminOverviewBoard';
import styles from '../features/admin-overview/components/AdminOverview.module.css';

// v1: admin accounts are invited/seeded directly, not self-serve — there's
// no admin signup flow anywhere in this repo or docforum-core, by design
// (PRD OQ-2). This page is real once an admin session exists.
//
// Issue #68: `/admin` is the "what needs attention" board, not the payments
// console — the console moved to `/admin/payments/console` with no
// functionality lost.
export function AdminDashboardPage() {
  return (
    <div className={styles.page}>
      <AdminOverviewBoard />

      <nav className={styles.consoleNav} aria-labelledby="admin-consoles-title">
        <h2 id="admin-consoles-title" className={styles.consoleTitle}>
          All admin consoles
        </h2>
        <ul className={styles.consoleList}>
          <li>
            <Link to="/admin/payments/console">Payments console</Link>
          </li>
          <li>
            <Link to="/admin/referrals">Stuck referrals</Link>
          </li>
          <li>
            <Link to="/admin/disputes">Fulfilment disputes</Link>
          </li>
          <li>
            <Link to="/admin/audit">Audit trail</Link>
          </li>
          <li>
            <Link to="/admin/flags">Feature flags</Link>
          </li>
          <li>
            <Link to="/admin/system">System health</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
