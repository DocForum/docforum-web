import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Log in</h1>
      <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      <p>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
