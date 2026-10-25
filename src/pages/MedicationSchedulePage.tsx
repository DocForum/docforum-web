import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { MedicationSchedule } from '../features/medications/components/MedicationSchedule';
import { PrescriptionSourceList } from '../features/medications/components/PrescriptionSourceList';

export function MedicationSchedulePage() {
  return (
    <div className="container">
      <ActingForBanner />
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>
            Medication schedule
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            A day-by-day plan derived from your active prescriptions, alongside the prescription lines exactly as
            they were written.
          </p>
        </div>
        <MedicationSchedule />
        <PrescriptionSourceList />
      </div>
    </div>
  );
}
