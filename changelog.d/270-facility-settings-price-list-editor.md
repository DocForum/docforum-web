Phase W4: price list editor against `/facilities/me/prices`

- Service switched from `/facilities/:facilityId/prices` to `/facilities/me/prices` so the backend determines the facility from the signed-in user.
- Amounts are sent as integer strings (stroops) converted from decimal enteries using the `parseAssetAmount` BigInt helpers in `src/features/facility-settings/validation.ts`.
- Prices are versioned (current / scheduled / past) rather than edited in place; writes create new versions via `POST /facilities/me/prices`.
- Future `effectiveFrom` dates are supported via date/time picker; a `409` conflict is handled by refetching the queue.
- Decimal precision is validated per asset (XLM/USDC: max 7 decimal places); exponent notation and over-wide decimals are rejected with a `400` error.
- Writes require a verified email on the user's account.
- MSW handlers in `src/mocks/handlers/facility-settings.ts` updated to match the new `/me` endpoints.
- `FacilitySettings.test.tsx` and `FacilitySettings.es.test.tsx` updated to assert the new endpoint shapes and stroops conversion.