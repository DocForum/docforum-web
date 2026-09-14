import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '../features/auth/components/SignupForm';

export function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="authContainer">
      <div className="card">
        <h1>Create your account</h1>
        <p>Search doctors by specialty, book a slot, and keep every referral and order in one thread.</p>
        <SignupForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
      <p className="authFootnote">
        Already have an account? <Link to="/login">Log in</Link>
        <br />
        Signing up as a lab or pharmacy? Facility accounts are admin-invited — contact your DocForum
        partner representative.
      </p>
    </div>
  );
}
