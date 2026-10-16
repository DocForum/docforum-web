import type { FacilityWithDistance } from '../../../types/models';
import { Button } from '../../../components/Button';
import styles from './FacilityFinder.module.css';

interface FacilityCardProps {
  facility: FacilityWithDistance;
  isSelected?: boolean;
  onSelect?: (facility: FacilityWithDistance) => void;
}

export function FacilityCard({ facility, isSelected = false, onSelect }: FacilityCardProps) {
  const isPharmacy = facility.type === 'pharmacy';

  return (
    <div
      className={`${styles.facilityCard} ${isSelected ? styles.facilityCardActive : ''}`}
      onClick={() => onSelect?.(facility)}
      role="article"
      aria-label={facility.name}
    >
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.facilityName}>{facility.name}</h4>
          {facility.location && (
            <div className={styles.cardDetails}>
              {facility.location.address}, {facility.location.city}
            </div>
          )}
        </div>
        <span className={`${styles.badge} ${isPharmacy ? styles.badgePharmacy : styles.badgeLab}`}>
          {facility.type}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
        {facility.distanceKm !== undefined && facility.distanceKm !== null ? (
          <span className={styles.distancePill}>
            📍 {facility.distanceKm.toFixed(1)} km away
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>Distance unknown</span>
        )}

        {facility.phone && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>📞 {facility.phone}</span>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="button"
          variant={isSelected ? 'primary' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(facility);
          }}
          style={{ padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}
        >
          {isSelected ? '✓ Selected' : 'Choose facility'}
        </Button>
      </div>
    </div>
  );
}
