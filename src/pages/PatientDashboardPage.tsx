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
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Doctor search, booking, and your appointments will live here — see ROADMAP.md Phase W2.</p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Link to="dependents">Manage dependents</Link>
          <Link to="health">Health profile</Link>
          <Link to="/care">Care journey timeline</Link>
          <Link to="facilities">Find pharmacies & labs</Link>
          <Link to="settings">Account settings & privacy</Link>
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
    </Routes>
  );
}
