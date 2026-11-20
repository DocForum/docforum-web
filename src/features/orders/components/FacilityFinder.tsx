import { useState, useMemo } from 'react';
import type {
  EligibleFacility,
  FacilityType,
  FacilityWithDistance,
} from '../../../types/models';
import { useGeolocation } from '../hooks/useGeolocation';
import { useEligibleFacilities, useFacilitySearch } from '../hooks/useFacilitySearch';
import { compareFacilitiesByPrice } from '../facility-price';
import { FacilityCard } from './FacilityCard';
import { FacilityMap } from './FacilityMap';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { FormError } from '../../../components/FormError';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useT } from '../../../i18n/useT';
import styles from './FacilityFinder.module.css';

interface FacilityFinderProps {
  initialType?: FacilityType;
  onFacilityChosen?: (facility: FacilityWithDistance) => void;
  /** Catalog code of the order item being fulfilled. When set, the finder
   * compares each facility's price for that item (issue #258). */
  catalogItemCode?: string;
}

type SortBy = 'distance' | 'price';

export function FacilityFinder({
  initialType,
  onFacilityChosen,
  catalogItemCode,
}: FacilityFinderProps) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const [selectedType, setSelectedType] = useState<FacilityType | undefined>(initialType);
  const [areaQuery, setAreaQuery] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const comparingPrices = Boolean(catalogItemCode);

  const { coordinates, isLoading: isLocating, error: geoError, requestLocation, clearLocation } = useGeolocation();

  const searchParams = useMemo(
    () => ({
      type: selectedType,
      lat: coordinates?.latitude,
      lng: coordinates?.longitude,
      query: areaQuery.trim() || undefined,
    }),
    [selectedType, coordinates, areaQuery],
  );

  const search = useFacilitySearch(searchParams, !comparingPrices);
  const eligible = useEligibleFacilities(catalogItemCode, searchParams);

  const facilities = useMemo<FacilityWithDistance[]>(() => {
    return comparingPrices ? (eligible.data ?? []) : (search.data ?? []);
  }, [comparingPrices, eligible.data, search.data]);
  const isSearching = comparingPrices ? eligible.isLoading : search.isLoading;
  const searchError = comparingPrices ? eligible.error : search.error;
  const refetchFacilities = comparingPrices ? eligible.refetch : search.refetch;

  const eligibleById = useMemo(() => {
    const byId = new Map<string, EligibleFacility>();
    for (const facility of eligible.data ?? []) byId.set(facility.id, facility);
    return byId;
  }, [eligible.data]);

  const visibleFacilities = useMemo<FacilityWithDistance[]>(() => {
    if (!comparingPrices || sortBy !== 'price') return facilities;
    return [...(eligible.data ?? [])].sort(compareFacilitiesByPrice);
  }, [facilities, eligible.data, comparingPrices, sortBy]);

  const handleSelectFacility = (facility: FacilityWithDistance) => {
    setSelectedFacilityId(facility.id);
    onFacilityChosen?.(facility);
  };

  return (
    <div className={styles.container} aria-label="Facility finder">
      <div className={styles.privacyCallout} role="note">
        <div>
          <p className={styles.privacyText}>
            <strong>Privacy Guarantee:</strong> DocForum uses your location only in active browser memory during this
            session to calculate real distances to participating pharmacies and laboratories. Your location is{' '}
            <em>never stored</em> in local storage, session storage, or URLs.
          </p>
        </div>
        <div>
          {coordinates ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ Location active
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={clearLocation}
                style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' }}
              >
                Clear
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={requestLocation}
              loading={isLocating}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isLocating ? 'Locating…' : '📍 Use current location'}
            </Button>
          )}
        </div>
      </div>

      {geoError && <FormError message={geoError} />}

      <div className={styles.controlsBar}>
        <div className={styles.filterTabs} role="tablist" aria-label="Facility type filters">
          <button
            type="button"
            role="tab"
            aria-selected={selectedType === undefined}
            className={`${styles.tabButton} ${selectedType === undefined ? styles.tabActive : ''}`}
            onClick={() => setSelectedType(undefined)}
          >
            All Facilities
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedType === 'pharmacy'}
            className={`${styles.tabButton} ${selectedType === 'pharmacy' ? styles.tabActive : ''}`}
            onClick={() => setSelectedType('pharmacy')}
          >
            Pharmacies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedType === 'lab'}
            className={`${styles.tabButton} ${selectedType === 'lab' ? styles.tabActive : ''}`}
            onClick={() => setSelectedType('lab')}
          >
            Diagnostic Labs
          </button>
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <TextField
            label="Search by area or postal code"
            type="text"
            placeholder="e.g. Westminster, Central District"
            value={areaQuery}
            onChange={(e) => setAreaQuery(e.target.value)}
          />
        </div>

        {comparingPrices && (
          <div className={styles.sortGroup} role="group" aria-label="Sort facilities">
            <span className={styles.sortLabel}>Sort by</span>
            <button
              type="button"
              className={`${styles.tabButton} ${sortBy === 'distance' ? styles.tabActive : ''}`}
              aria-pressed={sortBy === 'distance'}
              onClick={() => setSortBy('distance')}
            >
              Distance
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${sortBy === 'price' ? styles.tabActive : ''}`}
              aria-pressed={sortBy === 'price'}
              onClick={() => setSortBy('price')}
            >
              Price
            </button>
          </div>
        )}
      </div>

      {comparingPrices && (
        <p className={styles.sortHint} role="status">
          {sortBy === 'price'
            ? 'Sorted by price, cheapest first. Facilities with a price on request are listed last.'
            : 'Sorted by distance.'}
        </p>
      )}

      {searchError && (
        <InlineError
          title="Facilities couldn't be loaded"
          message={errorMessage(searchError) ?? t('facilityFinder.fetchError', 'Error fetching facilities')}
          onRetry={() => void refetchFacilities()}
        />
      )}

      {isSearching && (
        <Skeleton lines={3} height="2.5rem" label="Finding eligible facilities" />
      )}

      <div className={styles.layoutSplit}>
        <div className={styles.listColumn} role="feed" aria-busy={isSearching} aria-label="Facilities list">
          {facilities.length === 0 && !isSearching && !searchError && (
            <EmptyState
              title="No facilities found matching your criteria"
              description="Try a different area or postal code, or clear the filters to see every participating pharmacy and lab."
              action={{
                label: 'Clear search and filters',
                onClick: () => {
                  setAreaQuery('');
                  setSelectedType(undefined);
                },
              }}
            />
          )}

          {visibleFacilities.map((fac) => (
            <FacilityCard
              key={fac.id}
              facility={fac}
              isSelected={fac.id === selectedFacilityId}
              onSelect={handleSelectFacility}
              catalogItemCode={catalogItemCode}
              price={eligibleById.get(fac.id)?.price}
              priceOnRequest={eligibleById.get(fac.id)?.priceOnRequest}
            />
          ))}
        </div>

        <FacilityMap
          facilities={facilities}
          selectedFacilityId={selectedFacilityId}
          onMarkerClick={handleSelectFacility}
          userCoords={coordinates}
        />
      </div>
    </div>
  );
}
