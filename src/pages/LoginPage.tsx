import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="authContainer">
      <div className="card">
        <h1>Welcome back</h1>
        <p>Log in to pick up your care thread — bookings, referrals, orders, all in one place.</p>
        {(location.state as { passwordResetComplete?: boolean } | null)?.passwordResetComplete && (
          <p role="status">Your password has been updated. Sign in with your new password.</p>
        )}
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
      <p className="authFootnote">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
