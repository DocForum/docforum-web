import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { useAuthStore } from '../store/auth-store';
import { useT } from '../i18n/useT';
import styles from './LoginPage.module.css';

interface InviteNavState {
  inviteToken?: string;
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
  const inviteToken = (location.state as InviteNavState | null)?.inviteToken ?? null;

  function handleLoginSuccess() {
    navigate(inviteToken ? '/invite' : '/', {
      replace: true,
      state: inviteToken ? { inviteToken } : undefined,
    });
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
        {t('auth.noAccount', 'No account?')} <Link to="/signup">{t('auth.signUp', 'Sign up')}</Link>
      </p>
    </div>
  );
}
