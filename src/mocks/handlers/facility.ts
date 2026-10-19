// Facility finder endpoint with optional distance sorting.
import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';
import type { FacilityWithDistance } from '../../types/models';

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export const facilityHandlers = [
  http.get(
    '*/facilities',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const type = url.searchParams.get('type');
      const query = url.searchParams.get('query');
      const lat = url.searchParams.get('lat');
      const lng = url.searchParams.get('lng');

      let facilities: FacilityWithDistance[] = db.facilities.map((f) => ({ ...f }));
      if (type) facilities = facilities.filter((f) => f.type === type);
      if (query) {
        const q = query.toLowerCase();
        facilities = facilities.filter(
          (f) => f.name.toLowerCase().includes(q) || f.location?.city.toLowerCase().includes(q),
        );
      }
      if (lat !== null && lng !== null) {
        const userLat = Number(lat);
        const userLng = Number(lng);
        for (const facility of facilities) {
          facility.distanceKm = facility.location
            ? Number(
                haversineKm(userLat, userLng, facility.location.latitude, facility.location.longitude).toFixed(2),
              )
            : null;
        }
        facilities.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      }
      return facilities;
    }),
  ),
];
