import styles from './RoleSelect.module.css';
import type { SelfServeRole } from '../../../types/models';

const OPTIONS: { value: SelfServeRole; label: string }[] = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
];

interface RoleSelectProps {
  value: SelfServeRole;
  onChange: (role: SelfServeRole) => void;
}

/** Facility accounts are admin-invited only (PRD OQ-2) — deliberately not
 * offered here. See ARCHITECTURE_ESSENTIALS.md in docforum-core. */
export function RoleSelect({ value, onChange }: RoleSelectProps) {
  return (
    <div className={styles.group} role="radiogroup" aria-label="I am a">
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.option} data-selected={value === option.value}>
          <input
            type="radio"
            name="role"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
