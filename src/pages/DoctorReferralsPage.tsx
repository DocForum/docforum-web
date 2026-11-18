import { Route, Routes, useParams } from 'react-router-dom';
import { ReferralDetailPage } from '../features/referrals/components/ReferralDetailPage';
import { ReferralInbox } from '../features/referrals/components/ReferralInbox';

/** Mounted by App at `/doctor/referrals/*` — the routing table stays inside
 * this feature until the app-wide route list absorbs issue #41, so the
 * nested `<Routes>` below match relative to that splat. */
export function DoctorReferralsPage() {
  return (
    <div className="container">
      <Routes>
        <Route index element={<ReferralInbox />} />
        <Route path=":referralId" element={<ReferralRoute />} />
      </Routes>
    </div>
  );
}

function ReferralRoute() {
  const { referralId } = useParams<{ referralId: string }>();
  return <ReferralDetailPage referralId={referralId ?? ''} />;
}
