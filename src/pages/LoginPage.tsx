import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { safeReturnPath, takeReturnPath } from '../features/auth/return-path';
import { homePathForRole } from '../navigation/role-home';
import { useAuthStore } from '../store/auth-store';
import { useT } from '../i18n/useT';
import styles from './LoginPage.module.css';
import { paths } from '../routes/paths';

interface LoginNavState {
  inviteToken?: string;
  /** Optional explicit return path; otherwise the route guard's record is used. */
  returnTo?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const signOutReason = useAuthStore((state) => state.signOutReason);
  const t = useT();
  // Set by the idle-timeout sign-out (issue #82) so the person knows why
  // they landed here instead of finding a mysterious logout. Two sources
  // on purpose: the query param when our redirect wins the race, the
  // in-memory reason when a route guard's redirect strips it.
  const signedOutForIdle =
    searchParams.get('reason') === 'idle-timeout' || signOutReason === 'idle-timeout';

  // Set when an existing user followed "Log in to accept this invitation"
  // from the invite landing (issue #81) — after logging in, send them back
  // to the invite instead of home. Carried in router state only, never the
  // URL or storage.
  const navState = location.state as LoginNavState | null;
  const inviteToken = navState?.inviteToken ?? null;

  function handleLoginSuccess() {
    // Consume the guard's record once, whatever we end up doing with it.
    const returnTo = navState?.returnTo ?? takeReturnPath();

    if (inviteToken) {
      navigate(paths.invite, { replace: true, state: { inviteToken } });
      return;
    }

    const role = useAuthStore.getState().user?.role;
    const home = homePathForRole(role);

    // A shared device that sat idle must not deep-link the next person back
    // into the previous session's page — it may be PHI. The role home is the
    // deliberate destination instead (issue #226). Unknown roles land on the
    // public home page rather than a dashboard (issue #223).
    if (signedOutForIdle || !role || home === paths.home) {
      navigate(home, { replace: true });
      return;
    }

    navigate(safeReturnPath(returnTo, role), { replace: true });
  }

  return (
    <div className="authContainer">
      <div className="card">
        <h1>{t('auth.login.title', 'Welcome back')}</h1>
        {signedOutForIdle && (
          <p className={styles.idleNotice} role="status">
            You were signed out automatically after a period of inactivity — DocForum does this on
            shared devices to protect patient records. Anything you hadn’t saved is gone; sign in
            again to pick up where you left off.
          </p>
        )}
        <p>
          {t(
            'auth.login.subtitle',
            'Log in to pick up your care thread — bookings, referrals, orders, all in one place.',
          )}
        </p>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
      <p className="authFootnote">
        {t('auth.noAccount', 'No account?')} <Link to={paths.signup}>{t('auth.signUp', 'Sign up')}</Link>
      </p>
    </div>
  );
}
