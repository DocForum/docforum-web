import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { WalletLinkForm } from '../features/payments/components/WalletLinkForm';
import { FacilityQueuePanel } from '../features/facility-queue/components/FacilityQueuePanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useT } from '../i18n/useT';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export function FacilityDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const facilityId = 'fac-main';
  const t = useT();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label={t('facility.tabsNavAria', 'Facility navigation')}>
        <Link
          to="/facility"
          className={`${styles.tabLink} ${styles.tabLinkActive}`}
          aria-current="page"
        >
          {t('facility.tabQueue', 'Fulfillment Queue')}
        </Link>
        <Link to="/facility/verify" className={styles.tabLink}>
          Verify Order
        </Link>
        <Link to="/facility/team" className={styles.tabLink}>
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

      <div className={styles.header}>
        <div>
          <h1>{t('facility.title', 'Facility dashboard')}</h1>
          <p className={styles.headerSubtitle}>
            {t('facility.welcome', 'Welcome, {email} • Central Pharmacy & Diagnostic Center', {
              email: user?.email ?? '',
            })}
          </p>
        </div>
      </div>

      <ErrorBoundary level="section">
        <FacilityQueuePanel facilityId={facilityId} />
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <WalletLinkForm />
      </ErrorBoundary>
    </div>
  );
}
