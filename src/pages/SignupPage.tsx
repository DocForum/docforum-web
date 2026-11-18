import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '../features/auth/components/SignupForm';
import { useT } from '../i18n/useT';

export function SignupPage() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="authContainer">
      <div className="card">
        <h1>{t('auth.signup.title', 'Create your account')}</h1>
        <p>{t('auth.signup.subtitle', 'Search doctors by specialty, book a slot, and keep every referral and order in one thread.')}</p>
        <SignupForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
      <p className="authFootnote">
        {t('auth.haveAccount', 'Already have an account?')} <Link to="/login">{t('auth.logIn', 'Log in')}</Link>
        <br />
        {t(
          'auth.facilityInviteNote',
          'Signing up as a lab or pharmacy? Facility accounts are admin-invited — contact your DocForum partner representative.',
        )}
      </p>
    </div>
  );
}
