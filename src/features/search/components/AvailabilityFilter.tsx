import type { AvailabilityFilter } from '../../../types/models';
import { AVAILABILITY_OPTIONS } from '../search-params';
import styles from './DoctorSearch.module.css';

interface AvailabilityFilterProps {
  value: AvailabilityFilter;
  onChange: (value: AvailabilityFilter) => void;
}

/**
 * Availability filter, combining with the symptom selection. Same
 * tab-as-filter treatment as the facility finder's type tabs — a small,
 * fully keyboard-operable set of toggles rather than a dropdown.
 */
export function AvailabilityFilter({ value, onChange }: AvailabilityFilterProps) {
  return (
    <div className={styles.availabilityFilter}>
      <span id="availability-filter-label" className={styles.filterLabel}>
        Availability
      </span>
      <div role="tablist" aria-labelledby="availability-filter-label" className={styles.filterTabs}>
        {AVAILABILITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={value === option.value}
            className={`${styles.tabButton} ${value === option.value ? styles.tabActive : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
