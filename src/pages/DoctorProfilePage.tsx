import { useParams } from 'react-router-dom';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { DoctorProfileView } from '../features/doctor-search/components/DoctorProfileView';

export function DoctorProfilePage() {
  const { doctorId } = useParams<{ doctorId: string }>();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <ActingForBanner />
      {doctorId ? <DoctorProfileView doctorId={doctorId} /> : null}
    </div>
  );
}
