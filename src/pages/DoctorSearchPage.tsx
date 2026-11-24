import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { DoctorSearchView } from '../features/search/components/DoctorSearchView';

export function DoctorSearchPage() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />
      <DoctorSearchView />
    </div>
  );
}
