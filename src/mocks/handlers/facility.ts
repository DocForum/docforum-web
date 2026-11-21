// Facility finder endpoints, including the per-item prices patients compare
// before choosing a facility (issue #258).
import { http } from 'msw';
import { db } from '../db';
import { badRequest, respond } from '../helpers';
import type { EligibleFacility, FacilityWithDistance } from '../../types/models';

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

interface FacilityFilters {
  type: string | null;
  query: string | null;
  lat: string | null;
  lng: string | null;
}

function readFilters(url: URL): FacilityFilters {
  return {
    type: url.searchParams.get('type'),
    query: url.searchParams.get('query'),
    lat: url.searchParams.get('lat'),
    lng: url.searchParams.get('lng'),
  };
}

/** Type/area filtering, plus distance when coordinates are supplied. Shared by
 * the plain search and the per-item eligible list so they can never disagree. */
function applyFacilityFilters(
  facilities: FacilityWithDistance[],
  { type, query, lat, lng }: FacilityFilters,
): FacilityWithDistance[] {
  let result = facilities;
  if (type) result = result.filter((f) => f.type === type);
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (f) => f.name.toLowerCase().includes(q) || f.location?.city.toLowerCase().includes(q),
    );
  }
  if (lat !== null && lng !== null) {
    const userLat = Number(lat);
    const userLng = Number(lng);
    for (const facility of result) {
      facility.distanceKm = facility.location
        ? Number(
            haversineKm(userLat, userLng, facility.location.latitude, facility.location.longitude).toFixed(2),
          )
        : null;
    }
    result.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return result;
}

export const facilityHandlers = [
  http.get(
    '*/facilities',
    respond('list', ({ request }) =>
      applyFacilityFilters(db.facilities.map((f) => ({ ...f })), readFilters(new URL(request.url))),
    ),
  ),

  // docforum-core's public `GET /facilities/eligible` (issue #257): `type` (or
  // `capabilityType`) is required, location is `near=lat,lng` with an optional
  // `radiusKm`, and facilities with an unknown distance are listed last.
  http.get(
    '*/facilities/eligible',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const type = url.searchParams.get('type') ?? url.searchParams.get('capabilityType');
      const near = url.searchParams.get('near');
      const radiusKm = url.searchParams.get('radiusKm');
      const catalogItemCode = url.searchParams.get('catalogItemCode');
      if (!type) return badRequest('type or capabilityType is required');
      if (radiusKm !== null && near === null) return badRequest('radiusKm requires near');

      let lat: string | null = null;
      let lng: string | null = null;
      if (near !== null) {
        const [nearLat, nearLng, ...rest] = near.split(',');
        if (rest.length || !Number.isFinite(Number(nearLat)) || !Number.isFinite(Number(nearLng))) {
          return badRequest('near must be lat,lng');
        }
        lat = nearLat;
        lng = nearLng;
      }
      const radius = radiusKm === null ? null : Number(radiusKm);
      if (radius !== null && !(radius > 0)) return badRequest('radiusKm must be a positive number');

      const facilities = applyFacilityFilters(db.facilities.map((f) => ({ ...f })), {
        type,
        query: null,
        lat,
        lng,
      }).filter((f) => radius === null || (f.distanceKm != null && f.distanceKm <= radius));

      const now = Date.now();
      return facilities.map(
        (facility): EligibleFacility => {
          // Only the version already in force counts — a scheduled
          // (future-dated) price is never shown as the current one.
          const inForce = db.facilityPrices
            .filter(
              (price) =>
                price.facilityId === facility.id &&
                price.catalogItemCode === catalogItemCode &&
                Date.parse(price.effectiveFrom) <= now,
            )
            .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];

          if (!catalogItemCode) return { ...facility, price: null, priceOnRequest: false };
          return inForce
            ? {
                ...facility,
                price: {
                  amountStroops: inForce.amountStroops,
                  effectiveFrom: inForce.effectiveFrom,
                },
                priceOnRequest: false,
              }
            : { ...facility, price: null, priceOnRequest: true };
        },
      );
    }),
  ),
];
