import type { MouseEvent } from 'react';
import styles from './FacilitySettings.module.css';

interface LocationMapPickerProps {
  latitude: string;
  longitude: string;
  onCoordinateChange: (latitude: string, longitude: string) => void;
}

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

function coordinate(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function LocationMapPicker({
  latitude,
  longitude,
  onCoordinateChange,
}: LocationMapPickerProps) {
  const centerLat = coordinate(latitude, 51.505, -90, 90);
  const centerLng = coordinate(longitude, -0.09, -180, 180);
  const zoom = 13;
  const centerTileX = lon2tile(centerLng, zoom);
  const centerTileY = lat2tile(centerLat, zoom);

  const tiles: { x: number; y: number; key: string }[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      tiles.push({
        x: centerTileX + dx,
        y: centerTileY + dy,
        key: `${zoom}-${centerTileX + dx}-${centerTileY + dy}`,
      });
    }
  }

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;
    const latDelta = 0.05;
    const lngDelta = 0.08;
    const nextLat = centerLat + (0.5 - yRatio) * latDelta;
    const nextLng = centerLng + (xRatio - 0.5) * lngDelta;
    onCoordinateChange(nextLat.toFixed(6), nextLng.toFixed(6));
  };

  return (
    <div className={styles.mapBlock}>
      <div
        className={styles.mapFrame}
        role="region"
        aria-label="Map preview for the facility pin. Use the latitude and longitude fields below for a keyboard-accessible alternative."
        onClick={handleMapClick}
        title="Click anywhere on the map to move the pin"
      >
        <div className={styles.mapTiles} aria-hidden="true">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              className={styles.mapTile}
              loading="lazy"
            />
          ))}
        </div>
        <div className={styles.mapPin} aria-hidden="true">
          <span className={styles.mapPinDot} />
          <span className={styles.mapPinLabel}>Facility</span>
        </div>
        <div className={styles.mapAttribution}>
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors
        </div>
      </div>
      <p className={styles.mapHint}>
        Click the map to move the pin, or enter latitude and longitude below. The coordinate fields
        are the keyboard-accessible alternative to the map.
      </p>
    </div>
  );
}
