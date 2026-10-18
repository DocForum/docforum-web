import { useState, useMemo } from 'react';
import type { FacilityType, FacilityWithDistance } from '../../../types/models';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFacilitySearch } from '../hooks/useFacilitySearch';
import { FacilityCard } from './FacilityCard';
import { FacilityMap } from './FacilityMap';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Spinner } from '../../../components/Spinner';
import { FormError } from '../../../components/FormError';
import styles from './FacilityFinder.module.css';

interface FacilityFinderProps {
  initialType?: FacilityType;
  onFacilityChosen?: (facility: FacilityWithDistance) => void;
}

export function FacilityFinder({ initialType, onFacilityChosen }: FacilityFinderProps) {
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

  const { data: facilities = [], isLoading: isSearching, error: searchError } = useFacilitySearch(searchParams);

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
        <FormError message={searchError instanceof Error ? searchError.message : 'Error fetching facilities'} />
      )}

      {isSearching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
          <Spinner size={16} />
          <span>Finding eligible facilities…</span>
        </div>
      )}

      <div className={styles.layoutSplit}>
        <div className={styles.listColumn} role="feed" aria-busy={isSearching} aria-label="Facilities list">
          {facilities.length === 0 && !isSearching && (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <p style={{ margin: 0 }}>No facilities found matching your criteria.</p>
              <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)' }}>
                Try adjusting your search query or enabling location for distance results.
              </p>
            </div>
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
