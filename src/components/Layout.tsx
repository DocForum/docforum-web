import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ProfileSwitcher } from '../features/dependents/components/ProfileSwitcher';
import { Button } from './Button';
import { Logo } from './Logo';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import { OfflineBanner } from './OfflineBanner';
import { LocaleSwitcher } from '../i18n/LocaleSwitcher';
import styles from './Layout.module.css';

export function Layout() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // SPA route changes otherwise leave focus on the clicked link. Move it
  // to the main landmark so keyboard/screen-reader users start at the new
  // content, without stealing focus on first paint.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <OfflineBanner />
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <Logo />
          <span>DocForum</span>
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          {user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <ProfileSwitcher />
                  <Link
                    to="/care"
                    className={styles.navLink}
                    aria-current={location.pathname === '/care' ? 'page' : undefined}
                  >
                    Care journey
                  </Link>
                  <Link
                    to="/patient/settings"
                    className={styles.navLink}
                    aria-current={location.pathname === '/patient/settings' ? 'page' : undefined}
                  >
                    Settings
                  </Link>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <Link
                    to="/doctor"
                    className={styles.navLink}
                    aria-current={location.pathname === '/doctor' ? 'page' : undefined}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/doctor/insights"
                    className={styles.navLink}
                    aria-current={location.pathname === '/doctor/insights' ? 'page' : undefined}
                  >
                    Insights
                  </Link>
                </>
              )}
              {user.role === 'facility' && (
                <>
                  <Link
                    to="/facility"
                    className={styles.navLink}
                    aria-current={location.pathname === '/facility' ? 'page' : undefined}
                  >
                    Queue
                  </Link>
                  <Link to="/facility/verify" className={styles.navLink}>
                    Verify
                  </Link>
                  <Link to="/facility/team" className={styles.navLink}>
                    Team
                  </Link>
                  <Link to="/facility/payments" className={styles.navLink}>
                    Payouts
                  </Link>
                </>
              )}
              <span className={styles.user}>
                {user.email}
                {user.role === 'doctor' && <UnreadBadge />}
                <span className={styles.roleBadge} data-role={user.role}>
                  {user.role}
                </span>
              </span>
              <Button variant="secondary" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
                {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.navLink}>
                Log in
              </Link>
              <Link to="/signup" className={styles.navCta}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="main-content" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>DocForum — care continuity, escrow-secured fulfillment.</span>
        <Link to="/accessibility" className={styles.navLink}>
          Accessibility
        </Link>
        <LocaleSwitcher />
      </footer>
    </div>
  );
}
