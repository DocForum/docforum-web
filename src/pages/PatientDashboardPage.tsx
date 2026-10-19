import { Link, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { DependentsPage } from './DependentsPage';
import { HealthProfilePage } from './HealthProfilePage';
import { AccountSettingsPage } from './AccountSettingsPage';
import { FacilityFinderPage } from './FacilityFinderPage';
import { CareThreadPage } from './CareThreadPage';
import { useT } from '../i18n/useT';

function PatientHome() {
  const user = useAuthStore((state) => state.user);
  const t = useT();

  return (
    <div className="container">
      <ActingForBanner />
      <div className="card">
        <span className="statusPill">{t('patient.phasePill', 'Phase W2 · in progress')}</span>
        <h1>{t('patient.welcome', 'Welcome, {email}', { email: user?.email ?? '' })}</h1>
        <p>
          {t(
            'patient.placeholder',
            'Doctor search, booking, and your appointments will live here — see ROADMAP.md Phase W2.',
          )}
        </p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Link to="dependents">{t('patient.nav.dependents', 'Manage dependents')}</Link>
          <Link to="health">{t('patient.nav.health', 'Health profile')}</Link>
          <Link to="/care">{t('patient.nav.care', 'Care journey timeline')}</Link>
          <Link to="facilities">{t('patient.nav.facilities', 'Find pharmacies & labs')}</Link>
          <Link to="settings">{t('patient.nav.settings', 'Account settings & privacy')}</Link>
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
