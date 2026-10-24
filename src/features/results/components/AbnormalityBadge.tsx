import type { AbnormalityFlag } from '../../../types/models';
import styles from './AbnormalityBadge.module.css';

const LABEL: Record<AbnormalityFlag, string> = {
  normal: 'Normal',
  abnormal: 'Abnormal',
  critical: 'Critical',
};

/** Short flag marker used in list and detail headers. The reassuring
 * "your doctor has been notified" copy lives in LabResultDetail, not
 * here — this badge stays scannable at list density. */
export function AbnormalityBadge({ flag }: { flag: AbnormalityFlag }) {
  return (
    <span className={`${styles.badge} ${styles[flag]}`} data-flag={flag} aria-label={`Result flagged as ${LABEL[flag].toLowerCase()}`}>
      {LABEL[flag]}
    </span>
  );
}
