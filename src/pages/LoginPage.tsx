import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { useT } from '../i18n/useT';

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="authContainer">
      <div className="card">
        <h1>{t('auth.login.title', 'Welcome back')}</h1>
        <p>{t('auth.login.subtitle', 'Log in to pick up your care thread — bookings, referrals, orders, all in one place.')}</p>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
      <p className="authFootnote">
        {t('auth.noAccount', 'No account?')} <Link to="/signup">{t('auth.signUp', 'Sign up')}</Link>
      </p>
    </div>
  );
}
