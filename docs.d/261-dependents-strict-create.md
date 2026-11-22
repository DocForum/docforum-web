---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---

### Dependents create body is strict — relationship is edit-only (issue #261)

`POST /patients/me/dependents` in docforum-core accepts exactly
`{ fullName, dateOfBirth }` and returns `400` for any other field. This client
therefore sends only those two fields when adding a dependent. `relationship`
is still sent by `PATCH /patients/me/dependents/:id`, so it remains editable
on an existing dependent; the add form no longer asks for it, because a value
chosen there would be silently discarded.

The age-of-majority rule is mirrored client-side from
`VITE_AGE_OF_MAJORITY_YEARS` (default `18`), comparing calendar dates in the
user's local time so a date-only DOB never shifts across time zones. A
dependent whose birthday is today counts as at the age of majority. The server
stays authoritative: `400 DEPENDENT_NOT_A_MINOR` is mapped to the date-of-birth
field rather than shown as a form-level error.

`403 GUARDIANSHIP_INACTIVE` on profile-scoped acting-for calls is shown as the
handover explanation: the dependent's account has been handed over, so they
now manage their own bookings and records and the guardian can only view past
records.

Open question for docforum-core: whether `relationship` should be accepted on
create. Until then it is assumed to be derived server-side and returned on the
created `Dependent`.
