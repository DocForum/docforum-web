import { Link } from 'react-router-dom';
import { FacilityTeamView } from '../features/facility-team/components/FacilityTeamView';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export function FacilityTeamPage() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label="Facility navigation">
        <Link to="/facility" className={styles.tabLink}>
          Fulfillment Queue
        </Link>
        <Link to="/facility/team" className={`${styles.tabLink} ${styles.tabLinkActive}`}>
          Team &amp; Staff Accounts
        </Link>
      </nav>
      <div style={{ marginTop: 'var(--space-6)' }}>
        <FacilityTeamView />
      </div>
    </div>
  );
}
