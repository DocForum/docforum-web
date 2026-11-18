import { Link } from 'react-router-dom';
import { FacilityTeamView } from '../features/facility-team/components/FacilityTeamView';
import { useT } from '../i18n/useT';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export function FacilityTeamPage() {
  const t = useT();

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label={t('facility.tabsNavAria', 'Facility navigation')}>
        <Link to="/facility" className={styles.tabLink}>
          {t('facility.tabQueue', 'Fulfillment Queue')}
        </Link>
        <Link to="/facility/verify" className={styles.tabLink}>
          Verify Order
        </Link>
        <Link to="/facility/team" className={`${styles.tabLink} ${styles.tabLinkActive}`}>
          {t('facility.tabTeam', 'Team & Staff Accounts')}
        </Link>
        <Link to="/facility/payments" className={styles.tabLink}>
          Payouts &amp; Escrow
        </Link>
        <Link to="/facility/integrations" className={styles.tabLink}>
          Integrations
        </Link>
        <Link to="/facility/insights" className={styles.tabLink}>
          Performance
        </Link>
        <Link to="/facility/settings" className={styles.tabLink}>
          Settings
        </Link>
      </nav>
      <div style={{ marginTop: 'var(--space-6)' }}>
        <FacilityTeamView />
      </div>
    </div>
  );
}
