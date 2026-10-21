import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { useAuthStore } from '../store/auth-store';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signOutReason = useAuthStore((state) => state.signOutReason);
  // Set by the idle-timeout sign-out (issue #82) so the person knows why
  // they landed here instead of finding a mysterious logout. Two sources
  // on purpose: the query param when our redirect wins the race, the
  // in-memory reason when a route guard's redirect strips it.
  const signedOutForIdle =
    searchParams.get('reason') === 'idle-timeout' || signOutReason === 'idle-timeout';

  return (
    <div className="authContainer">
      <div className="card">
        <h1>Welcome back</h1>
        {signedOutForIdle && (
          <p className={styles.idleNotice} role="status">
            You were signed out automatically after a period of inactivity — DocForum does this on
            shared devices to protect patient records. Anything you hadn’t saved is gone; sign in
            again to pick up where you left off.
          </p>
        )}
        <p>Log in to pick up your care thread — bookings, referrals, orders, all in one place.</p>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
      <p className="authFootnote">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
