import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { WalletLinkForm } from '../features/payments/components/WalletLinkForm';
import { FacilityQueuePanel } from '../features/facility-queue/components/FacilityQueuePanel';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export function FacilityDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const facilityId = 'fac-main';

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label="Facility navigation">
        <Link to="/facility" className={`${styles.tabLink} ${styles.tabLinkActive}`}>
          Fulfillment Queue
        </Link>
        <Link to="/facility/verify" className={styles.tabLink}>
          Verify Order
        </Link>
        <Link to="/facility/team" className={styles.tabLink}>
          Team &amp; Staff Accounts
        </Link>
        <Link to="/facility/payments" className={styles.tabLink}>
          Payouts &amp; Escrow
        </Link>
      </nav>

      <div className={styles.header}>
        <div>
          <h1>Facility dashboard</h1>
          <p className={styles.headerSubtitle}>
            Welcome{user ? `, ${user.email}` : ''} • Central Pharmacy &amp; Diagnostic Center
          </p>
        </div>
      </div>

      <FacilityQueuePanel facilityId={facilityId} />

      <WalletLinkForm />
    </div>
  );
}
