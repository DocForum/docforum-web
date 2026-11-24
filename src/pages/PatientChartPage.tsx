import { useParams } from 'react-router-dom';
import { PatientChartPanel } from '../features/patient-chart/components/PatientChartPanel';

export function PatientChartPage() {
  const { patientProfileId } = useParams<{ patientProfileId: string }>();
  return (
    <div className="container">
      <PatientChartPanel patientProfileId={patientProfileId} />
    </div>
  );
}
