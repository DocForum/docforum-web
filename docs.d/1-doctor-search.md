---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — Doctor directory & specialty search (issues #1, #13)

No assumption remains for doctor discovery: `docforum-core`'s public directory
endpoints are real and are the only source this repo calls.

- `GET /specialties` → `Specialty[]` (`{ id, name, slug }`).
- `GET /doctors?specialty=<slug>&q=&limit=&cursor=` →
  `{ items: [{ id, fullName, specialties: [{ id, name, slug }] }], nextCursor }`.
  Only verified profiles and public fields are returned; `limit` is 1–50 and
  pagination is a keyset cursor.
- `GET /availability/doctors/:doctorProfileId/slots` → open future
  `AvailabilitySlot[]` (`{ id, doctorProfileId, status, startTime, endTime,
  createdAt, updatedAt }`). Public by design.

`src/services/doctor-directory-service.ts` owns the directory reads and pages
the list explicitly (`listAllPublicDoctors`, `getPublicDoctor`) because there is
no public single-doctor route. Availability is read through
`src/services/appointments-service.ts`'s `getOpenSlots`.

The older symptom-search path (issue #30, `src/features/search/`) still uses its
own assumed `/symptoms` + `specialtyIds` contract; it is deliberately untouched
here and remains tracked as an assumption.
