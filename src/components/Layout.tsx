import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ProfileSwitcher } from '../features/dependents/components/ProfileSwitcher';
import { Button } from './Button';
import { Logo } from './Logo';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import styles from './Layout.module.css';

export function Layout() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

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
                    Care journey
                  </Link>
                  <Link to="/patient/settings" className={styles.navLink}>
                    Settings
                  </Link>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <Link to="/doctor" className={styles.navLink}>
                    Dashboard
                  </Link>
                  <Link to="/doctor/insights" className={styles.navLink}>
                    Insights
                  </Link>
                </>
              )}
              {user.role === 'facility' && (
                <>
                  <Link to="/facility" className={styles.navLink}>
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
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>DocForum — care continuity, escrow-secured fulfillment.</span>
      </footer>
    </div>
  );
}
