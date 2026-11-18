import { useState, useMemo } from 'react';
import type { FacilityType, FacilityWithDistance } from '../../../types/models';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFacilitySearch } from '../hooks/useFacilitySearch';
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
}

export function FacilityFinder({ initialType, onFacilityChosen }: FacilityFinderProps) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const [selectedType, setSelectedType] = useState<FacilityType | undefined>(initialType);
  const [areaQuery, setAreaQuery] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

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

  const {
    data: facilities = [],
    isLoading: isSearching,
    error: searchError,
    refetch: refetchFacilities,
  } = useFacilitySearch(searchParams);

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
      </div>

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

          {facilities.map((fac) => (
            <FacilityCard
              key={fac.id}
              facility={fac}
              isSelected={fac.id === selectedFacilityId}
              onSelect={handleSelectFacility}
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
