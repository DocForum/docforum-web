import { useSearchParams } from 'react-router-dom';
import { ClaimAccountForm } from '../features/dependents/components/ClaimAccountForm';
import { useT } from '../i18n/useT';

export function ClaimAccountPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const t = useT();

  if (!token) {
    return (
      <div className="container">
        <div className="card">
          <h1>{t('claim.invalidTitle', 'Invalid link')}</h1>
          <p>{t('claim.invalidBody', 'This claim link is missing or invalid. Ask your guardian to resend the invite.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <ClaimAccountForm token={token} />
      </div>
    </div>
  );
}
