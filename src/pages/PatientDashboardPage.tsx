import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { PatientOnboarding } from '../features/onboarding/components/PatientOnboarding';
import { CareCardList } from '../features/care-hub/components/CareCardList';
import { EmptyState } from '../components/states/EmptyState';
import { InlineError } from '../components/states/InlineError';
import { Skeleton } from '../components/states/Skeleton';
import { useCareHub } from '../features/care-hub/hooks/useCareHub';
import { groupBySection } from '../features/care-hub/ranking';
import { AppointmentDetailPage } from './AppointmentDetailPage';
import { AppointmentsPage } from './AppointmentsPage';
import { BookingPage } from './BookingPage';
import { DoctorDirectoryPage } from './DoctorDirectoryPage';
import { DependentsPage } from './DependentsPage';
import { HealthProfilePage } from './HealthProfilePage';
import { AccountSettingsPage } from './AccountSettingsPage';
import { FacilityFinderPage } from './FacilityFinderPage';
import { CareThreadPage } from './CareThreadPage';
import { DoctorSearchPage } from './DoctorSearchPage';
import { OrdersPage } from './OrdersPage';
import { PatientReferralsPage } from './PatientReferralsPage';
import { WaitlistPage } from './WaitlistPage';
import { IntakePage } from './IntakePage';
import { WaitlistOfferBanner } from '../features/waitlist/components/WaitlistOfferBanner';
import { MessageThreadPage } from './MessageThreadPage';
import { useProfileBootstrap } from '../features/patients/hooks/useProfileBootstrap';
import { useT } from '../i18n/useT';
import styles from './PatientDashboardPage.module.css';

// The order detail page is only needed on one nested route. Loading it lazily
// keeps its payment panel and fulfilment components out of the dashboard
// chunk now that the duplicate top-level route no longer splits it (#222).
const OrderDetailPage = lazy(() =>
  import('./OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })),
);

function PatientHome() {
  const { cards, sources } = useCareHub();
  const sections = groupBySection(cards);
  const t = useT();

  // A source that failed must not blank the hub: its section says so, the
  // others still render from the data that did arrive.
  const anyLoading = sources.dependents.isLoading || sources.appointments.isLoading || sources.orders.isLoading || sources.health.isLoading;

  return (
    <div className="container">
      <ActingForBanner />
      <PatientOnboarding />
      <WaitlistOfferBanner />

      <div className="card">
        <span className="statusPill">{t('patient.phasePill', 'Phase W2 · in progress')}</span>
        <h1 className={styles.title}>What needs your attention</h1>

        {anyLoading && <Skeleton lines={3} label="Loading your care summary" />}

        <section aria-labelledby="action-needed">
          <h2 id="action-needed" className={styles.heading}>
            Action needed
          </h2>
          {sources.dependents.failed || sources.appointments.failed || sources.orders.failed || sources.health.failed ? (
            <InlineError
              title={null}
              message="Some of your information could not be loaded. Everything else below is still current — retry by reloading this page."
            />
          ) : null}
          {sections.action.length > 0 ? (
            <CareCardList cards={sections.action} />
          ) : !anyLoading ? (
            <EmptyState
              title="Nothing needs your attention right now"
              description="Bookings, handovers and recent changes show up here when they need you."
              action={{ label: 'Update your health details', to: '/patient/health' }}
            />
          ) : null}
        </section>

        {sections.upcoming.length > 0 && (
          <section aria-labelledby="coming-up">
            <h2 id="coming-up" className={styles.heading}>
              Coming up
            </h2>
            <CareCardList cards={sections.upcoming} />
          </section>
        )}

        {sections.recent.length > 0 && (
          <section aria-labelledby="recent">
            <h2 id="recent" className={styles.heading}>
              Recent
            </h2>
            <CareCardList cards={sections.recent} />
          </section>
        )}

        <nav className={styles.links} aria-label="Your record">
          <Link to="appointments">My appointments</Link>
          <Link to="doctors">Browse doctors by specialty</Link>
          <Link to="search">{t('patient.nav.findDoctor', 'Find a doctor by symptom')}</Link>
          <Link to="dependents">{t('patient.nav.dependents', 'Manage dependents')}</Link>
          <Link to="health">{t('patient.nav.health', 'Health profile')}</Link>
          <Link to="referrals">Referrals</Link>
          <Link to="waitlist">My waitlists</Link>
          <Link to="/care">{t('patient.nav.care', 'Care journey timeline')}</Link>
          <Link to="orders">My prescriptions & lab orders</Link>
          <Link to="facilities">{t('patient.nav.facilities', 'Find pharmacies & labs')}</Link>
          <Link to="settings">{t('patient.nav.settings', 'Account settings & privacy')}</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/account/access-log">Who viewed my records</Link>
        </nav>
      </div>
    </div>
  );
}

export function PatientDashboardPage() {
  // Profile-scoped reads (`/patients/:profileId/...`) need the caller's own
  // profile id, which the auth session does not carry.
  useProfileBootstrap();

  return (
    <Routes>
      <Route index element={<PatientHome />} />
      <Route path="search" element={<DoctorSearchPage />} />
      <Route path="doctors" element={<DoctorDirectoryPage />} />
      <Route path="book" element={<BookingPage />} />
      <Route path="appointments" element={<AppointmentsPage />} />
      <Route path="dependents" element={<DependentsPage />} />
      <Route path="referrals" element={<PatientReferralsPage />} />
      <Route path="waitlist" element={<WaitlistPage />} />
      <Route path="health" element={<HealthProfilePage />} />
      <Route path="facilities" element={<FacilityFinderPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route
        path="orders/:orderId"
        element={
          <Suspense fallback={<Skeleton lines={4} label="Loading order" />}>
            <OrderDetailPage />
          </Suspense>
        }
      />
      <Route path="messages/:threadId" element={<MessageThreadPage />} />
      <Route path="settings" element={<AccountSettingsPage />} />
      <Route path="care/*" element={<CareThreadPage />} />
      <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
      <Route path="appointments/:appointmentId/intake" element={<IntakePage />} />
    </Routes>
  );
}
