// Facility settings and versioned price lists (issue #56).
import { http } from 'msw';
import { db } from '../db';
import { badRequest, notFound, paramId, respond } from '../helpers';
import type {
  CatalogItem,
  FacilityPrice,
  FacilitySettings,
  FacilitySettingsInput,
  PayoutAsset,
} from '../../types/models';

const ASSETS: PayoutAsset[] = ['XLM', 'USDC'];

export const facilitySettingsHandlers = [
  http.get(
    '*/facilities/:facilityId/settings',
    respond('json', ({ params }) => {
      const settings = db.facilitySettings.find(
        (entry) => entry.facilityId === paramId(params, 'facilityId'),
      );
      return settings ?? notFound('facility settings');
    }),
  ),

  http.patch(
    '*/facilities/:facilityId/settings',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const existing = db.facilitySettings.find((entry) => entry.facilityId === facilityId);
      if (!existing) return notFound('facility settings');
      const body = (await request.json().catch(() => ({}))) as Partial<FacilitySettingsInput>;

      if (!body.address?.trim() || !body.city?.trim() || !body.phone?.trim()) {
        return badRequest('address, city and phone are required');
      }
      if (
        typeof body.latitude !== 'number' ||
        body.latitude < -90 ||
        body.latitude > 90 ||
        typeof body.longitude !== 'number' ||
        body.longitude < -180 ||
        body.longitude > 180
      ) {
        return badRequest('latitude/longitude are out of range');
      }

      const updated: FacilitySettings = {
        ...existing,
        address: body.address.trim(),
        city: body.city.trim(),
        latitude: body.latitude,
        longitude: body.longitude,
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        openingHours: body.openingHours ?? existing.openingHours,
        updatedAt: new Date().toISOString(),
      };
      db.facilitySettings = db.facilitySettings.map((entry) =>
        entry.facilityId === facilityId ? updated : entry,
      );
      return updated;
    }),
  ),

  http.get(
    '*/catalog/items',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query')?.trim().toLowerCase();
      const type = url.searchParams.get('type');
      let items: CatalogItem[] = db.catalogItems.map((item) => ({ ...item }));
      if (query) {
        items = items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query),
        );
      }
      if (type) items = items.filter((item) => item.type === type);
      return items;
    }),
  ),

  http.get(
    '*/facilities/:facilityId/prices',
    respond('list', ({ params }) =>
      db.facilityPrices.filter(
        (price) => price.facilityId === paramId(params, 'facilityId'),
      ),
    ),
  ),

  http.post(
    '*/facilities/:facilityId/prices',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const body = (await request.json().catch(() => ({}))) as Partial<FacilityPrice>;
      const catalogItem = db.catalogItems.find((item) => item.code === body.catalogItemCode);
      if (!catalogItem) return badRequest('catalogItemCode is not in the catalog');
      if (!body.asset || !ASSETS.includes(body.asset)) {
        return badRequest('asset must be XLM or USDC');
      }
      if (!body.amountStroops || !/^\d+$/.test(body.amountStroops)) {
        return badRequest('amountStroops must be a whole number of stroops');
      }
      if (BigInt(body.amountStroops) <= 0n) {
        return badRequest('amountStroops must be greater than 0');
      }
      if (!body.effectiveFrom || Number.isNaN(new Date(body.effectiveFrom).getTime())) {
        return badRequest('effectiveFrom must be a valid timestamp');
      }

      const created: FacilityPrice = {
        id: `prc-mock-${Date.now()}`,
        facilityId,
        catalogItemCode: catalogItem.code,
        catalogItemName: catalogItem.name,
        asset: body.asset,
        amountStroops: body.amountStroops,
        effectiveFrom: new Date(body.effectiveFrom).toISOString(),
        createdAt: new Date().toISOString(),
      };
      db.facilityPrices.unshift(created);
      return created;
    }),
  ),
];
