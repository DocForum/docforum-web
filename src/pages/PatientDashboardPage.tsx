import { Link, Route, Routes } from 'react-router-dom';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { CareCardList } from '../features/care-hub/components/CareCardList';
import { useCareHub } from '../features/care-hub/hooks/useCareHub';
import { groupBySection } from '../features/care-hub/ranking';
import { AppointmentDetailPage } from './AppointmentDetailPage';
import { DependentsPage } from './DependentsPage';
import { HealthProfilePage } from './HealthProfilePage';
import { AccountSettingsPage } from './AccountSettingsPage';
import { FacilityFinderPage } from './FacilityFinderPage';
import { CareThreadPage } from './CareThreadPage';
import styles from './PatientDashboardPage.module.css';

function PatientHome() {
  const { cards, sources } = useCareHub();
  const sections = groupBySection(cards);

  // A source that failed must not blank the hub: its section says so, the
  // others still render from the data that did arrive.
  const anyLoading = sources.dependents.isLoading || sources.appointments.isLoading || sources.health.isLoading;

  return (
    <div className="container">
      <ActingForBanner />

      <div className="card">
        <span className="statusPill">Phase W2 · in progress</span>
        <h1 className={styles.title}>What needs your attention</h1>

        {anyLoading && <p className={styles.loading}>Loading your care summary…</p>}

        <section aria-labelledby="action-needed">
          <h2 id="action-needed" className={styles.heading}>
            Action needed
          </h2>
          {sources.dependents.failed || sources.appointments.failed || sources.health.failed ? (
            <p className={styles.sourceError} role="status">
              Some of your information could not be loaded. Everything else below is still current — retry
              by reloading this page.
            </p>
          ) : null}
          {sections.action.length > 0 ? (
            <CareCardList cards={sections.action} />
          ) : !anyLoading ? (
            <p className={styles.empty}>Nothing needs your attention right now.</p>
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
          <Link to="dependents">Manage dependents</Link>
          <Link to="health">Health profile</Link>
          <Link to="/care">Care journey timeline</Link>
          <Link to="facilities">Find pharmacies & labs</Link>
          <Link to="settings">Account settings & privacy</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/account/access-log">Who viewed my records</Link>
        </nav>
      </div>
    </div>
  );
}

export function PatientDashboardPage() {
  return (
    <Routes>
      <Route index element={<PatientHome />} />
      <Route path="dependents" element={<DependentsPage />} />
      <Route path="health" element={<HealthProfilePage />} />
      <Route path="facilities" element={<FacilityFinderPage />} />
      <Route path="settings" element={<AccountSettingsPage />} />
      <Route path="care/*" element={<CareThreadPage />} />
      <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
    </Routes>
  );
}
