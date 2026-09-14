import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { Button } from './Button';
import styles from './Layout.module.css';

export function Layout() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          DocForum
        </Link>
        <nav className={styles.nav}>
          {user ? (
            <>
              <span className={styles.user}>
                {user.email} · {user.role}
              </span>
              <Button variant="secondary" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
