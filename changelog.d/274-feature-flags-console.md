Phase W6: feature flags console against `/admin/feature-flags` (issue #274)

- Service switched from `/admin/flags` to `/admin/feature-flags` and `PATCH /admin/flags/:key` to `PATCH /admin/feature-flags/:key` per docforum-core#132.
- `listFeatureFlags` now calls `GET /admin/feature-flags` — returns all flags in the environment, unpaginated (tens of flags, not thousands).
- `updateFeatureFlag` now calls `PATCH /admin/feature-flags/:key` with the flag key in the URL path.
- Key validation: new keys must be lowercase dotted segments of up to 64 characters; the backend returns `400` for invalid keys, which the UI maps to field-level errors.
- `updatedAt` is returned with every flag and displayed in the "Last changed" column; clicking "View in audit trail" links to `/admin/audit?entityType=FeatureFlag&entityId=<id>`.
- Role targeting and allowlist UI: the edit dialog shows before/after values for enabled, rollout percentage, roles, and user allowlist. A review step renders each changed field side-by-side before the admin confirms.
- Percentage values must be whole numbers 0–100; allowlist entries must be user UUIDs (emails are rejected).
- 409 conflict on concurrent edit: the dialog notices when the flag changes under the admin, and offers "Start again from the latest" to reload the server state.
- MSW handlers updated to match `/admin/feature-flags`; test mocks updated to assert the new endpoint paths and key validation.
- `FeatureFlagsConsole.test.tsx` and `FeatureFlagsConsole.es.test.tsx` updated to assert the new service function signatures, key validation, and audit trail links.