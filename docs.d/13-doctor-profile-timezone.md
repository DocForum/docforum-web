---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Doctor profile week view — doctor time zone (issue #13)

The profile page renders every slot in the patient's chosen IANA zone
(`TimeZoneProvider`) and states that zone above the grid. When the doctor's
zone is known and differs, it is shown as "…'s local time: <zone>".

**Assumed:** `GET /doctors` does not expose the `DoctorProfile.timeZone` column
today, even though the column exists in docforum-core's schema. The frontend
types it as optional (`PublicDoctor.timeZone`); until the public projection
includes it, the doctor-zone line is simply absent and only the patient's zone
is shown. No request is made to an endpoint that does not exist — the profile
itself is resolved by paging the real public list, which also avoids assuming a
`GET /doctors/:id` route.
