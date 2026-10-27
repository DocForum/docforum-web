import { Link } from 'react-router-dom';
import { SpecialtyClaimsConsole } from '../features/admin-verification/components/SpecialtyClaimsConsole';
import styles from '../features/admin-verification/components/SpecialtyClaims.module.css';

export function AdminVerificationPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <SpecialtyClaimsConsole />
    </div>
  );
}
