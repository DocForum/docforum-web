import { Link } from 'react-router-dom';
import { PatientReferralList } from '../features/referrals/components/PatientReferralList';

/** Route body for `/patient/referrals` (issue #4). */
export function PatientReferralsPage() {
  return (
    <div className="container">
      <p>
        <Link to="/patient">← Back to your care summary</Link>
      </p>

      <div className="card">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: 0 }}>
          Referrals
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          A referral from your doctor doesn’t book anything by itself. Read it here, then accept to
          get an appointment with the specialist or decline to send it back.
        </p>
        <PatientReferralList />
      </div>
    </div>
  );
}
