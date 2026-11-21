import { useT } from '../../../i18n/useT';
import type { AvailabilityFilter as AvailabilityFilterValue } from '../../../types/models';
import { AVAILABILITY_OPTIONS } from '../search-params';
import styles from './DoctorSearch.module.css';

interface AvailabilityFilterProps {
  value: AvailabilityFilterValue;
  onChange: (value: AvailabilityFilterValue) => void;
}

/** Filter values are API identifiers: each one has its own static label call. */
function availabilityLabel(value: AvailabilityFilterValue, t: ReturnType<typeof useT>): string {
  switch (value) {
    case 'any':
      return t('search.availability.any', 'Any time');
    case 'week':
      return t('search.availability.week', 'This week');
    case 'today':
      return t('search.availability.today', 'Today');
  }
}

/**
 * Availability filter, combining with the symptom selection. Same
 * tab-as-filter treatment as the facility finder's type tabs — a small,
 * fully keyboard-operable set of toggles rather than a dropdown.
 */
export function AvailabilityFilter({ value, onChange }: AvailabilityFilterProps) {
  const t = useT();

  return (
    <div className={styles.availabilityFilter}>
      <span id="availability-filter-label" className={styles.filterLabel}>
        {t('search.availability.label', 'Availability')}
      </span>
      <div role="tablist" aria-labelledby="availability-filter-label" className={styles.filterTabs}>
        {AVAILABILITY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={value === option}
            className={`${styles.tabButton} ${value === option ? styles.tabActive : ''}`}
            onClick={() => onChange(option)}
          >
            {availabilityLabel(option, t)}
          </button>
        ))}
      </div>
    </div>
  );
}
