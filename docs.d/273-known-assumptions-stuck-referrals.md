### Stuck referrals console against `/referrals/admin/*` (issue #273)

- **Queue list:** `GET /referrals/admin/queue?olderThan=<24h|48h|72h|168h>` — returns `{items: StuckReferral[], nextCursor}` oldest first. The `olderThan` parameter is the only server-side filter; the UI's 1/2/3/7-day thresholds map to the durational values `24h`, `48h`, `72h`, `168h`. A `reason` filter is applied client-side over the loaded pages, since docforum-core#68 does not expose a server-side `reason` query parameter (unknown params return `400`).

- **StuckReferral shape:** Embedded `stuckReason: 'no_doctor'|'doctor_inactive'|'loop_flagged'`, `targetSpecialty: Specialty`, `referringDoctor`/`targetDoctor` as `{id, fullName}`, and `chain: ReferralChainLink[] | null` (present only for `loop_flagged`, oldest hop first, ending with the referral itself). `ReferralChainLink` = `{referralId, referringDoctor, targetSpecialty, targetDoctor, status, createdAt}`. No patient name or ID is shown.

- **Reassign:** `POST /referrals/admin/:id/reassign` body = `{targetDoctorId, reason, expectedUpdatedAt}`. Returns the updated `Referral`. `409` if the referral is not in `pending` status — the dialog closes and the queue refetches. Client-side eligibility checks: only verified doctors in the target specialty, excluding the current target doctor and the referring doctor. Availability (open slots in next 7 days) is also re-checked from `/admin/doctors?specialtyId=...&verificationStatus=verified`.

- **Cancel:** `POST /referrals/admin/:id/cancel` body = `{reason, expectedUpdatedAt}`. Docforum-core notifies the patient; the client only records the action. The resulting status is not assumed to be `cancelled` in `ReferralStatus` (no cancelled value yet).

- **Audit events:** `GET /referrals/admin/:id/audit-events` returns `{items: AuditEvent[], nextCursor}` newest first. Each event has `actorUserId`, `actorRole`, `entityType: 'Referral'`, `entityId`, `action`, `fromState`, `toState`, `requestId`, `metadata`, `createdAt`. The console links each action to `/admin/audit?entityType=Referral&entityId=<id>`.

- **409 conflict handling:** If reassign or cancel receives `409` (someone else modified the referral), the dialog closes and the queue is refetched. Network failures leave the dialog open; retrying is safe because a duplicate submission comes back as `409`.