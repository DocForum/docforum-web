import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '../features/auth/components/SignupForm';

export function SignupPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Create your account</h1>
      <SignupForm onSuccess={() => navigate('/', { replace: true })} />
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      <p>
        <small>
          Signing up as a lab or pharmacy? Facility accounts are set up by an admin — contact your
          DocForum partner representative.
        </small>
      </p>
    </div>
  );
}
