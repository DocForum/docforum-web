import type { LabResultFlag } from '../../../../types/models';
import { FLAG_LABEL } from '../flags';
import styles from './LabResults.module.css';

export function ResultFlagBadge({ flag }: { flag: LabResultFlag }) {
  return (
    <span className={`${styles.flag} ${styles[`flag_${flag}`]}`} data-flag={flag}>
      {FLAG_LABEL[flag]}
    </span>
  );
}
