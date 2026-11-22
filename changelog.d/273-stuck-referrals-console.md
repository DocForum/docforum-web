Phase W6: stuck referrals console against `/referrals/admin/*` (issue #273)

- Queue endpoint switched from `GET /admin/referrals?status=pending&olderThan=...` to `GET /referrals/admin/queue?olderThan=...` per docforum-core#68.
- New `listStuckReferrals` service function in `src/services/admin-referrals-service.ts` maps the UI's 1/2/3/7-day age thresholds to the `olderThan` query parameter.
- `listReferralAuditEvents` added to fetch `GET /referrals/admin/:id/audit-events` for the expandable history panel per referral.
- `listReassignCandidates` updated to query `/admin/doctors?specialtyId&verificationStatus=verified` (unchanged path but service layer now calls the real backend contract).
- `reassignReferral` and `cancelReferral` now POST to `/referrals/admin/:id/reassign` and `/referrals/admin/:id/cancel` respectively.
- `409` conflict on reassign (non-pending referral) is handled by closing the dialog and refetching the queue; `404` on queue refetch explains "docforum-core doesn't serve this yet".
- Loop-flagged filter added to the UI: the reason filter client-side filters loaded pages since docforum-core#68 doesn't define a server-side reason filter.
- Expandable history panel per referral from the `audit-events` endpoint, showing actor role, action, fromState, toState, reason, and time.
- MSW handlers updated; test mocks updated to match new endpoint shapes.
- `StuckReferralsConsole.test.tsx` and `StuckReferralsConsole.es.test.tsx` updated to assert the new service function signatures and audit panel behavior.