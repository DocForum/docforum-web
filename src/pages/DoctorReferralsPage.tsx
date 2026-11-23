import { NavLink, Route, Routes, useParams } from 'react-router-dom';
import { ReferralDetailPage } from '../features/referrals/components/ReferralDetailPage';
import { ReferralInbox } from '../features/referrals/components/ReferralInbox';
import { SentReferrals } from '../features/referrals/components/SentReferrals';
import styles from './DoctorReferralsPage.module.css';

/** Mounted by App at `/doctor/referrals/*` — the routing table stays inside
 * this feature until the app-wide route list absorbs issue #41, so the
 * nested `<Routes>` below match relative to that splat. */
export function DoctorReferralsPage() {
  return (
    <div className="container">
      <nav className={styles.viewTabs} aria-label="Referral views">
        <NavLink to="/doctor/referrals" end className={({ isActive }) => tabClass(isActive)}>
          Received
        </NavLink>
        <NavLink to="/doctor/referrals/sent" className={({ isActive }) => tabClass(isActive)}>
          Sent
        </NavLink>
      </nav>

      <Routes>
        <Route index element={<ReferralInbox />} />
        <Route path="sent" element={<SentReferrals />} />
        <Route path=":referralId" element={<ReferralRoute />} />
      </Routes>
    </div>
  );
}

function tabClass(isActive: boolean) {
  return isActive ? `${styles.tab} ${styles.activeTab}` : styles.tab;
}

function ReferralRoute() {
  const { referralId } = useParams<{ referralId: string }>();
  return <ReferralDetailPage referralId={referralId ?? ''} />;
}
