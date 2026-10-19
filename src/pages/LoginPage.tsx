import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';

interface InviteNavState {
  inviteToken?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
        <h1>Welcome back</h1>
        <p>Log in to pick up your care thread — bookings, referrals, orders, all in one place.</p>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
      <p className="authFootnote">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
