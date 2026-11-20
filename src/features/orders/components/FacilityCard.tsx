import type { FacilityItemPrice, FacilityWithDistance } from '../../../types/models';
import { Button } from '../../../components/Button';
import { useFormat } from '../../../i18n/useFormat';
import { useFacilityPriceHistory } from '../hooks/useFacilitySearch';
import {
  facilityPriceLabel,
  priceInForce,
  recentPriceChange,
} from '../facility-price';
import styles from './FacilityFinder.module.css';

interface FacilityCardProps {
  facility: FacilityWithDistance;
  isSelected?: boolean;
  onSelect?: (facility: FacilityWithDistance) => void;
  /** Catalog code of the order item being fulfilled. When set, the card shows
   * this facility's price for that item (issue #258). */
  catalogItemCode?: string;
  /** The price in force for `catalogItemCode`, or null when none is published. */
  price?: FacilityItemPrice | null;
  priceOnRequest?: boolean;
}

export function FacilityCard({
  facility,
  isSelected = false,
  onSelect,
  catalogItemCode,
  price = null,
  priceOnRequest = false,
}: FacilityCardProps) {
  const { formatNumber } = useFormat();
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
          <h2 className={styles.facilityName}>{facility.name}</h2>
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
            <span aria-hidden="true">📍</span>{' '}
            {formatNumber(facility.distanceKm, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            km away
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>Distance unknown</span>
        )}

        {facility.phone && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>📞 {facility.phone}</span>
        )}
      </div>

      {catalogItemCode ? (
        <FacilityPriceBlock
          facilityId={facility.id}
          catalogItemCode={catalogItemCode}
          price={price}
          priceOnRequest={priceOnRequest}
        />
      ) : null}

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

interface FacilityPriceBlockProps {
  facilityId: string;
  catalogItemCode: string;
  price: FacilityItemPrice | null;
  priceOnRequest: boolean;
}

/**
 * The price for the order item, plus a "price changed on …" note read from the
 * facility's own price history. The history request is made per card (lazily,
 * after the facility list is on screen), and only the version in force counts:
 * a scheduled future price is never shown as current.
 */
function FacilityPriceBlock({
  facilityId,
  catalogItemCode,
  price,
  priceOnRequest,
}: FacilityPriceBlockProps) {
  const { formatDate } = useFormat();
  // Nothing to explain for a facility that publishes no price at all, so the
  // history is only requested for cards that actually show a price.
  const { data: history = [] } = useFacilityPriceHistory(price ? facilityId : undefined);
  const now = Date.now();

  // Trust the API's "price in force" only while it really is in force; a
  // future-dated one falls back to the latest history version already active.
  const providedInForce =
    price !== null && Date.parse(price.effectiveFrom) <= now;
  const current = providedInForce ? price : (priceInForce(history, catalogItemCode) ?? null);
  const changed = recentPriceChange(history, catalogItemCode, now);

  return (
    <div className={styles.priceBlock}>
      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>Price</span>
        {current ? (
          <span className={styles.priceValue}>{facilityPriceLabel(current)}</span>
        ) : (
          <span className={styles.priceOnRequest}>
            {priceOnRequest || !price ? 'Price on request' : 'No current price'}
          </span>
        )}
      </div>
      {current && changed ? (
        <p className={styles.priceChangeNote}>
          Price changed on {formatDate(changed.effectiveFrom)}
        </p>
      ) : null}
    </div>
  );
}
