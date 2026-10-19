import { Link, Outlet, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuthStore } from '../store/auth-store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ProfileSwitcher } from '../features/dependents/components/ProfileSwitcher';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import { Button } from './Button';
import { ErrorBoundary } from './ErrorBoundary';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import styles from './Layout.module.css';

export function Layout() {
  const intl = useIntl();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const location = useLocation();

  const t = (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage });

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <Logo />
          <span>DocForum</span>
        </Link>
        <nav className={styles.nav}>
          {user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <ProfileSwitcher />
                  <Link to="/care" className={styles.navLink}>
                    {t('nav.careJourney', 'Care journey')}
                  </Link>
                  <Link to="/patient/settings" className={styles.navLink}>
                    {t('nav.settings', 'Settings')}
                  </Link>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <Link to="/doctor" className={styles.navLink}>
                    {t('nav.dashboard', 'Dashboard')}
                  </Link>
                  <Link to="/doctor/insights" className={styles.navLink}>
                    {t('nav.insights', 'Insights')}
                  </Link>
                </>
              )}
              {user.role === 'facility' && (
                <>
                  <Link to="/facility" className={styles.navLink}>
                    {t('nav.queue', 'Queue')}
                  </Link>
                  <Link to="/facility/verify" className={styles.navLink}>
                    Verify
                  </Link>
                  <Link to="/facility/team" className={styles.navLink}>
                    {t('nav.team', 'Team')}
                  </Link>
                  <Link to="/facility/payments" className={styles.navLink}>
                    Payouts
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" className={styles.navLink}>
                    Payments
                  </Link>
                  <Link to="/admin/referrals" className={styles.navLink}>
                    Referrals
                  </Link>
                  <Link to="/admin/audit" className={styles.navLink}>
                    Audit trail
                  </Link>
                  <Link to="/admin/flags" className={styles.navLink}>
                    Flags
                  </Link>
                  <Link to="/admin/system" className={styles.navLink}>
                    System
                  </Link>
                </>
              )}
              <LanguageSwitcher />
              <span className={styles.user}>
                {user.email}
                {user.role === 'doctor' && <UnreadBadge />}
                <span className={styles.roleBadge} data-role={user.role}>
                  {t(`roles.${user.role}`, user.role)}
                </span>
              </span>
              <Button variant="secondary" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
                {logoutMutation.isPending ? t('nav.loggingOut', 'Logging out…') : t('nav.logOut', 'Log out')}
              </Button>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <Link to="/login" className={styles.navLink}>
                {t('nav.logIn', 'Log in')}
              </Link>
              <Link to="/signup" className={styles.navCta}>
                {t('nav.signUp', 'Sign up')}
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>
        {/* Route-level boundary: a page crash keeps the header, navigation and
            session intact and offers a retry. Keyed by pathname so navigating
            away clears the error state. */}
        <ErrorBoundary key={location.pathname} level="route">
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className={styles.footer}>
        <span>{t('app.footer', 'DocForum — care continuity, escrow-secured fulfillment.')}</span>
      </footer>
    </div>
  );
}
