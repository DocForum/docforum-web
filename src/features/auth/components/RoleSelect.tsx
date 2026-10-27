import styles from './RoleSelect.module.css';
import type { SelfServeRole } from '../../../types/models';
import { useT } from '../../../i18n/useT';

const OPTIONS: { value: SelfServeRole; id: string; defaultMessage: string }[] = [
  { value: 'patient', id: 'roles.patient', defaultMessage: 'Patient' },
  { value: 'doctor', id: 'roles.doctor', defaultMessage: 'Doctor' },
];

interface RoleSelectProps {
  value: SelfServeRole;
  onChange: (role: SelfServeRole) => void;
}

/** Facility accounts are admin-invited only (PRD OQ-2) — deliberately not
 * offered here. See ARCHITECTURE_ESSENTIALS.md in docforum-core. */
export function RoleSelect({ value, onChange }: RoleSelectProps) {
  const t = useT();

  return (
    <div className={styles.group} role="radiogroup" aria-label={t('auth.roleGroup', 'I am a')}>
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.option} data-selected={value === option.value}>
          <input
            type="radio"
            name="role"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {t(option.id, option.defaultMessage)}
        </label>
      ))}
    </div>
  );
}
