import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { returnTo?: unknown } | null;
  const returnTo =
    typeof state?.returnTo === 'string' && state.returnTo.startsWith('/') && !state.returnTo.startsWith('//')
      ? state.returnTo
      : '/';

  return (
    <div className="authContainer">
      <div className="card">
        <h1>Welcome back</h1>
        <p>Log in to pick up your care thread — bookings, referrals, orders, all in one place.</p>
        <LoginForm onSuccess={() => navigate(returnTo, { replace: true })} />
      </div>
      <p className="authFootnote">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
