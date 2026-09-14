import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { Button } from './Button';
import { Logo } from './Logo';
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
              <span className={styles.user}>
                {user.email}
                <span className={styles.roleBadge} data-role={user.role}>
                  {user.role}
                </span>
              </span>
              <Button variant="secondary" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                Log out
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
