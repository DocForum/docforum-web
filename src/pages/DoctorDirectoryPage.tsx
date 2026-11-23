import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { DoctorDirectory } from '../features/doctor-search/components/DoctorDirectory';

export function DoctorDirectoryPage() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />
      <DoctorDirectory />
    </div>
  );
}
