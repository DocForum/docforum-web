import { Link, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { DependentsPage } from './DependentsPage';
import { HealthProfilePage } from './HealthProfilePage';

function PatientHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <ActingForBanner />
      <div className="card">
        <span className="statusPill">Phase W2 · in progress</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Doctor search, booking, and your appointments will live here — see ROADMAP.md Phase W2.</p>
        <nav style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Link to="dependents">Manage dependents</Link>
          <Link to="health">Health profile</Link>
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
    </Routes>
  );
}
