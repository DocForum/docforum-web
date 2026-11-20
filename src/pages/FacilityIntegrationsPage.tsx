import { Link } from 'react-router-dom';
import { IntegrationsView } from '../features/integrations/components/IntegrationsView';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export function FacilityIntegrationsPage() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label="Facility navigation">
        <Link to="/facility" className={styles.tabLink}>
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
        <Link
          to="/facility/integrations"
          className={`${styles.tabLink} ${styles.tabLinkActive}`}
        >
          Integrations
        </Link>
      </nav>
      <div style={{ marginTop: 'var(--space-6)' }}>
        <IntegrationsView />
      </div>
    </div>
  );
}
