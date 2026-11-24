import { useParams } from 'react-router-dom';
import { ConsultationNote } from '../features/consultation/components/ConsultationNote';
import { ConsultationOutcomePanel } from '../features/consultation/components/ConsultationOutcomePanel';
import styles from './DoctorConsultationPage.module.css';

/**
 * The consultation screen: the note (sign-off/addenda) plus the outcome and
 * order issuance panel (issue #267). Both are keyed by the appointment id.
 */
export function DoctorConsultationPage() {
  const { appointmentId = '' } = useParams<{ appointmentId: string }>();

  return (
    <div className={styles.page}>
      <ConsultationNote appointmentId={appointmentId} />
      <ConsultationOutcomePanel appointmentId={appointmentId} />
    </div>
  );
}
