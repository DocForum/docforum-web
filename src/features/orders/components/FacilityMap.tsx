import type { FacilityWithDistance } from '../../../types/models';
import styles from './FacilityFinder.module.css';

interface FacilityMapProps {
  facilities: FacilityWithDistance[];
  selectedFacilityId?: string | null;
  onMarkerClick?: (facility: FacilityWithDistance) => void;
  userCoords?: { latitude: number; longitude: number } | null;
}

// Convert lat/lng to OpenStreetMap tile numbers
function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

export function FacilityMap({
  facilities,
  selectedFacilityId,
  onMarkerClick,
  userCoords,
}: FacilityMapProps) {
  // Use user location or default to first facility or central coords
  const centerLat = userCoords?.latitude ?? facilities[0]?.location?.latitude ?? 51.505;
  const centerLng = userCoords?.longitude ?? facilities[0]?.location?.longitude ?? -0.09;

  const zoom = 13;
  const centerTileX = lon2tile(centerLng, zoom);
  const centerTileY = lat2tile(centerLat, zoom);

  // Generate 3x3 grid of surrounding tiles
  const tiles: { x: number; y: number; key: string }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({
        x: centerTileX + dx,
        y: centerTileY + dy,
        key: `${zoom}-${centerTileX + dx}-${centerTileY + dy}`,
      });
    }
  }

  // Calculate relative pixel offsets for markers on the map
  // Bound range around the center coordinates
  const latDelta = 0.05;
  const lngDelta = 0.08;

  return (
    <div className={styles.mapColumn} role="region" aria-label="Interactive map of nearby facilities">
      <div className={styles.mapWrapper}>
        <div className={styles.mapTilesGrid} aria-hidden="true">
          {tiles.map((t) => (
            <img
              key={t.key}
              src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
              alt=""
              className={styles.tileImg}
              loading="lazy"
            />
          ))}
        </div>

        <div className={styles.mapOverlays}>
          {userCoords && (
            <div
              className={styles.marker}
              style={{
                top: `${Math.max(10, Math.min(90, 50 - ((userCoords.latitude - centerLat) / latDelta) * 50))}%`,
                left: `${Math.max(10, Math.min(90, 50 + ((userCoords.longitude - centerLng) / lngDelta) * 50))}%`,
              }}
              title="Your location (in memory only)"
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  border: '3px solid #ffffff',
                  boxShadow: '0 0 0 2px rgba(37,99,235,0.4)',
                }}
              />
              <span className={styles.markerLabel} style={{ background: '#2563eb', color: '#ffffff' }}>
                You
              </span>
            </div>
          )}

          {facilities.map((fac, idx) => {
            const lat = fac.location?.latitude ?? centerLat + ((idx % 3) - 1) * 0.01;
            const lng = fac.location?.longitude ?? centerLng + ((idx % 2) - 0.5) * 0.02;

            const topPercent = Math.max(12, Math.min(88, 50 - ((lat - centerLat) / latDelta) * 50));
            const leftPercent = Math.max(12, Math.min(88, 50 + ((lng - centerLng) / lngDelta) * 50));
            const isSelected = fac.id === selectedFacilityId;

            return (
              <div
                key={fac.id}
                className={`${styles.marker} ${isSelected ? styles.markerActive : ''}`}
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                onClick={() => onMarkerClick?.(fac)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Marker for ${fac.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onMarkerClick?.(fac);
                  }
                }}
              >
                <div className={styles.pin}>
                  <span className={styles.pinIcon}>{fac.type === 'pharmacy' ? '💊' : '🔬'}</span>
                </div>
                <span className={styles.markerLabel}>{fac.name}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.mapAttribution}>
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors
        </div>
      </div>
    </div>
  );
}
