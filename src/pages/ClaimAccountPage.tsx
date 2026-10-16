import { useSearchParams } from 'react-router-dom';
import { ClaimAccountForm } from '../features/dependents/components/ClaimAccountForm';

export function ClaimAccountPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token) {
    return (
      <div className="container">
        <div className="card">
          <h2>Invalid link</h2>
          <p>This claim link is missing or invalid. Ask your guardian to resend the invite.</p>
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
